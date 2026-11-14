import { authorizeOrganisationAction, createAuth } from '@founders-coffee/auth';
import { AppError, organisationIdSchema } from '@founders-coffee/core';
import { readOrganisationLogo } from '@founders-coffee/db';
import { profile } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { getAuthEnv, resolveSession } from '../auth.js';
import { getDb } from '../db.js';
import { photoServices } from '../profile/photo-runtime.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { consumeRateBudget } from '../rate-consume.js';
import { readBounded } from '../read-bounded.js';
import { isCrossSite, json, UPLOAD_STATUS } from '../upload-http.js';
import {
  changeOrganisationLogo,
  ORGANISATION_LOGO_PREFIX,
  organisationLogoKey,
} from './logo.js';

const UPLOAD_PREFIX = '/api/organisations/';

const mutate = async (
  request: Request,
  organisationId: string,
): Promise<Response> => {
  if (isCrossSite(request)) return json(403, 'cross_site_upload');
  const session = await resolveSession(request.headers);
  const { auth } = createAuth(getAuthEnv());
  await authorizeOrganisationAction({
    auth,
    db: getDb(),
    headers: request.headers,
    session,
    organisationId,
    resource: 'organization',
    action: 'update',
  });
  if (!session) return json(401, 'unauthenticated');
  const services = photoServices();
  if (!services) return json(503, 'photo_storage_unavailable');
  const budget = RATE_BUDGETS.expensive.photoUpload;
  if (
    !(await consumeRateBudget(
      `u:${session.user.id}`,
      budget.action,
      budget.limit,
      budget.windowMs,
    ))
  )
    return json(429, 'rate_limited');
  const bytes =
    request.method === 'PUT'
      ? await readBounded(request, profile.PROFILE_PHOTO_MAX_BYTES)
      : null;
  if (request.method === 'PUT' && !bytes) return json(413, 'photo_too_large');
  const result = await changeOrganisationLogo(getDb(), services, {
    organisationId,
    userId: session.user.id,
    bytes,
  });
  if (!result.ok)
    return json(
      UPLOAD_STATUS[result.error.code] ??
        (result.error.code === 'conflict' ? 409 : 400),
      result.error.code,
    );
  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store' },
  });
};

const deliver = async (
  request: Request,
  organisationId: string,
): Promise<Response> => {
  const current = await readOrganisationLogo(getDb(), organisationId);
  if (new URL(request.url).pathname !== current) return json(404, 'not_found');
  const key = organisationLogoKey(organisationId, current);
  const services = photoServices();
  if (!key || !services) return json(404, 'not_found');
  const stored = await services.store.get(key);
  if (!stored) return json(404, 'not_found');
  return new Response(stored.body, {
    headers: {
      'content-type': stored.contentType,
      'cache-control': 'private, no-cache',
      'x-content-type-options': 'nosniff',
    },
  });
};

const safely = async (work: () => Promise<Response>): Promise<Response> => {
  try {
    return await work();
  } catch (error) {
    if (
      error instanceof AppError &&
      ['unauthenticated', 'forbidden', 'organisation_not_approved'].includes(
        error.code,
      )
    )
      return json(error.code === 'unauthenticated' ? 401 : 403, error.code);
    logger.error('organisation.logo_failed', { error });
    return json(500, 'photo_failed');
  }
};

/** Raw image transfer uses the shared session, organisation authorisation and image pipeline. */
export const handleOrganisationLogoRequest = (
  request: Request,
  url: URL,
): Promise<Response> | null => {
  const isUpload =
    url.pathname.startsWith(UPLOAD_PREFIX) &&
    ['PUT', 'DELETE'].includes(request.method);
  const isDelivery =
    url.pathname.startsWith(ORGANISATION_LOGO_PREFIX) &&
    request.method === 'GET';
  if (!isUpload && !isDelivery) return null;
  const rest = url.pathname
    .slice((isUpload ? UPLOAD_PREFIX : ORGANISATION_LOGO_PREFIX).length)
    .split('/');
  const organisationId = organisationIdSchema.safeParse(rest[0]);
  if (
    !organisationId.success ||
    rest.length !== 2 ||
    (isUpload && rest[1] !== 'logo')
  )
    return Promise.resolve(json(404, 'not_found'));
  return safely(() =>
    isUpload
      ? mutate(request, organisationId.data)
      : deliver(request, organisationId.data),
  );
};
