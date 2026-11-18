import { readViewableScreenshot } from '@founders-coffee/db';
import { idSchema } from '@founders-coffee/core';
import { profile } from '@founders-coffee/domain';
import {
  R2PhotoStore,
  CloudflareImagesNormalizer,
} from '@founders-coffee/infra';
import { logger } from '@founders-coffee/observability';

import { resolveSession } from '../auth.js';
import { getDb } from '../db.js';
import { workerEnv } from '../env.js';
import type { PhotoServices } from '../profile/photo.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { consumeRateBudget } from '../rate-consume.js';
import { readBounded } from '../read-bounded.js';
import { isCrossSite, json, UPLOAD_STATUS } from '../upload-http.js';
import { loadTeamHackathon } from './team-context.js';
import { acceptScreenshotUpload } from './screenshots.js';

export const SCREENSHOT_UPLOAD_PREFIX = '/api/hackathon/screenshot/';
export const SCREENSHOT_DELIVERY_PREFIX = '/media/submission/';

/** The screenshot pipeline, or nothing where the environment has not been given one. */
const screenshotServices = (): PhotoServices | null => {
  const env = workerEnv();
  if (!env.SUBMISSION_ASSETS || !env.IMAGES) return null;
  return {
    store: new R2PhotoStore(env.SUBMISSION_ASSETS),
    normalizer: new CloudflareImagesNormalizer(env.IMAGES),
  };
};

const handleUpload = async (
  request: Request,
  screenshotId: string,
): Promise<Response> => {
  if (isCrossSite(request)) return json(403, 'cross_site_upload');
  const services = screenshotServices();
  if (!services) return json(503, 'photo_storage_unavailable');
  const session = await resolveSession(request.headers);
  const userId = session?.user?.id;
  if (!userId) return json(401, 'unauthenticated');

  const budget = RATE_BUDGETS.expensive.screenshotUpload;
  const allowed = await consumeRateBudget(
    `u:${userId}`,
    budget.action,
    budget.limit,
    budget.windowMs,
  );
  if (!allowed) return json(429, 'rate_limited');

  const bytes = await readBounded(request, profile.PROFILE_PHOTO_MAX_BYTES);
  if (!bytes) return json(413, 'photo_too_large');

  const result = await acceptScreenshotUpload(getDb(), services, {
    userId,
    screenshotId,
    bytes,
  });
  if (!result.ok) {
    logger.warn('hackathon.submission_screenshot_rejected', {
      screenshotId,
      code: result.error.code,
    });
    return json(UPLOAD_STATUS[result.error.code] ?? 400, result.error.code);
  }
  return new Response(JSON.stringify(result.data), {
    status: 201,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
};

/**
 * Serve a screenshot to someone allowed to see it, asked again on every request, revalidations
 * included, so a judge who recuses or a member who leaves loses it at once.
 */
const handleDelivery = async (
  request: Request,
  screenshotId: string,
): Promise<Response> => {
  const services = screenshotServices();
  if (!services) return json(503, 'photo_storage_unavailable');
  const session = await resolveSession(request.headers);
  const userId = session?.user?.id;
  if (!userId) return json(404, 'not_found');
  const db = getDb();
  const row = await readViewableScreenshot(db, { id: screenshotId, userId });
  if (!row) return json(404, 'not_found');
  const hackathon = await loadTeamHackathon(db, row.eventId);
  if (!hackathon.ok) return json(404, 'not_found');

  const etag = `"${screenshotId}"`;
  const headers = {
    'cache-control': 'private, no-cache',
    etag,
    vary: 'Cookie',
  };
  if (request.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers });
  const stored = await services.store.get(row.objectKey);
  if (!stored) return json(404, 'not_found');
  return new Response(stored.body, {
    headers: { ...headers, 'content-type': stored.contentType },
  });
};

/**
 * The two screenshot paths the Worker serves directly, or `null` when the request is not one of
 * them. They sit outside the server-function pipeline for the reasons a profile photo's do: an
 * upload is raw bytes, and a delivery is an image response with its own ETag and content type.
 */
export const handleSubmissionScreenshotRequest = (
  request: Request,
  url: URL,
): Promise<Response> | null => {
  const isUpload =
    url.pathname.startsWith(SCREENSHOT_UPLOAD_PREFIX) &&
    request.method === 'PUT';
  const isDelivery =
    url.pathname.startsWith(SCREENSHOT_DELIVERY_PREFIX) &&
    request.method === 'GET';
  if (!isUpload && !isDelivery) return null;
  const prefix = isUpload
    ? SCREENSHOT_UPLOAD_PREFIX
    : SCREENSHOT_DELIVERY_PREFIX;
  const screenshotId = idSchema.safeParse(url.pathname.slice(prefix.length));
  if (!screenshotId.success) return Promise.resolve(json(404, 'not_found'));
  return isUpload
    ? handleUpload(request, screenshotId.data)
    : handleDelivery(request, screenshotId.data);
};
