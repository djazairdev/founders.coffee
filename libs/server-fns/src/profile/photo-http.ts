import { getDeliverableProfilePhoto } from '@founders-coffee/db';
import { profile } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { resolveSession } from '../auth.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { consumeRateBudget } from '../rate-consume.js';
import { readBounded } from '../read-bounded.js';
import { isCrossSite, json, UPLOAD_STATUS } from '../upload-http.js';
import { acceptPhotoUpload } from './photo.js';
import { photoServices } from './photo-runtime.js';

export const PHOTO_UPLOAD_PREFIX = '/api/profile/photo/';
export const PHOTO_DELIVERY_PREFIX = '/media/profile/';

const handleUpload = async (
  request: Request,
  assetId: string,
): Promise<Response> => {
  if (isCrossSite(request)) return json(403, 'cross_site_upload');
  const services = photoServices();
  if (!services) return json(503, 'photo_storage_unavailable');
  const session = await resolveSession(request.headers);
  const userId = session?.user?.id;
  if (!userId) return json(401, 'unauthenticated');

  const budget = RATE_BUDGETS.expensive.photoUpload;
  const allowed = await consumeRateBudget(
    `u:${userId}`,
    budget.action,
    budget.limit,
    budget.windowMs,
  );
  if (!allowed) return json(429, 'rate_limited');

  const bytes = await readBounded(request, profile.PROFILE_PHOTO_MAX_BYTES);
  if (!bytes) return json(413, 'photo_too_large');

  const result = await acceptPhotoUpload(getDb(), services, {
    userId,
    assetId,
    bytes,
  });
  if (!result.ok) {
    logger.warn('profile_photo_rejected', {
      userId,
      assetId,
      code: result.error.code,
    });
    return json(UPLOAD_STATUS[result.error.code] ?? 400, result.error.code);
  }
  return new Response(JSON.stringify({ assetId: result.data.assetId }), {
    status: 201,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
};

/** Revalidate avatar eligibility before delivery or a 304, including after removal or moderation. */
const handleDelivery = async (
  request: Request,
  assetId: string,
  variantName: string,
): Promise<Response> => {
  const services = photoServices();
  if (!services) return json(503, 'photo_storage_unavailable');
  const variant = profile.profilePhotoVariantSchema.safeParse(variantName);
  if (!variant.success) return json(404, 'not_found');

  const row = await getDeliverableProfilePhoto(getDb(), assetId);
  if (!row) return json(404, 'not_found');

  const etag = `"${assetId}-${row.revision}-${variant.data}"`;
  const headers = {
    'cache-control': 'private, no-cache',
    etag,
    vary: 'Cookie',
  };
  if (request.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers });

  const stored = await services.store.get(
    profile.profilePhotoObjectKey(row.objectKey, variant.data),
  );
  if (!stored) return json(404, 'not_found');
  return new Response(stored.body, {
    headers: { ...headers, 'content-type': stored.contentType },
  });
};

/**
 * The two photo paths the Worker serves directly, or `null` when the request is not one of them.
 *
 * They are outside the server-function pipeline on purpose. An upload is a multi-megabyte body that
 * should never be serialized through an RPC envelope, and a delivery is an image response that has
 * to carry its own ETag and content type. Both still consume the same Durable Object rate buckets
 * and the same session as everything else.
 */
export const handleProfilePhotoRequest = (
  request: Request,
  url: URL,
): Promise<Response> | null => {
  if (
    url.pathname.startsWith(PHOTO_UPLOAD_PREFIX) &&
    request.method === 'PUT'
  ) {
    const assetId = url.pathname.slice(PHOTO_UPLOAD_PREFIX.length);
    return assetId && !assetId.includes('/')
      ? handleUpload(request, assetId)
      : Promise.resolve(json(404, 'not_found'));
  }
  if (
    url.pathname.startsWith(PHOTO_DELIVERY_PREFIX) &&
    request.method === 'GET'
  ) {
    const [assetId, variant, ...rest] = url.pathname
      .slice(PHOTO_DELIVERY_PREFIX.length)
      .split('/');
    return assetId && variant && rest.length === 0
      ? handleDelivery(request, assetId, variant)
      : Promise.resolve(json(404, 'not_found'));
  }
  return null;
};
