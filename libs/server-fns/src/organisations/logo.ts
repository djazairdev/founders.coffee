import { organisationRoleAllows } from '@founders-coffee/auth';
import { AppError, err, id, ok } from '@founders-coffee/core';
import {
  getOrganisation,
  readOrganisationMembership,
  replaceOrganisationLogo,
  type Db,
} from '@founders-coffee/db';
import { logger } from '@founders-coffee/observability';

import { inspectPhoto, type PhotoServices } from '../profile/photo.js';

export const ORGANISATION_LOGO_PREFIX = '/media/organisations/';

/** Resolve only keys minted by this upload path, never an external or arbitrary object path. */
export const organisationLogoKey = (
  organisationId: string,
  logo: string | null,
): string | null => {
  const prefix = `${ORGANISATION_LOGO_PREFIX}${organisationId}/`;
  const token = logo?.startsWith(prefix) ? logo.slice(prefix.length) : '';
  return /^logo_[a-f0-9]{32}$/u.test(token)
    ? `organisations/${organisationId}/${token}`
    : null;
};

/** Cleanup cannot undo an accepted change, but failures remain visible in server logs. */
const cleanLogo = async (services: PhotoServices, key: string | null) => {
  if (!key) return;
  try {
    await services.store.deletePrefix(key);
  } catch {
    logger.warn('organisation.logo_cleanup_failed', { key });
  }
};

export const cleanOrganisationLogo = async (
  services: PhotoServices | null,
  organisationId: string,
  logo: string | null,
) => {
  const key = organisationLogoKey(organisationId, logo);
  if (!key) return;
  if (!services) {
    logger.warn('organisation.logo_cleanup_unavailable', { organisationId });
    return;
  }
  await cleanLogo(services, key);
};

/** Validate and normalise a logo before atomically attaching it; discard a losing concurrent upload. */
export const changeOrganisationLogo = async (
  db: Db,
  services: PhotoServices,
  input: { organisationId: string; userId: string; bytes: Uint8Array | null },
) => {
  const current = await getOrganisation(db, input.organisationId);
  if (!current) return err(new AppError('not_found', 'Organisation not found'));
  const membership = await readOrganisationMembership(db, input);
  if (
    !membership ||
    membership.status !== 'approved' ||
    !organisationRoleAllows(membership.role, 'organization', 'update')
  )
    return err(
      new AppError('forbidden', 'Organisation editing is not allowed'),
    );
  let logo: string | null = null;
  let key: string | null = null;
  if (input.bytes !== null) {
    const checked = await inspectPhoto(services, input.bytes);
    if (!checked.ok) return checked;
    const normalised = await services.normalizer.scaledDown(input.bytes, 512);
    logo = `${ORGANISATION_LOGO_PREFIX}${input.organisationId}/${id('logo')}`;
    key = organisationLogoKey(input.organisationId, logo);
    if (!key) return err(new AppError('validation_failed', 'Invalid logo key'));
    await services.store.put(key, normalised.bytes, normalised.contentType);
  }
  let attached = false;
  try {
    attached = await replaceOrganisationLogo(db, {
      ...input,
      previous: current.logo,
      expectedRole: membership.role,
      logo,
    });
  } finally {
    if (!attached) await cleanLogo(services, key);
  }
  if (!attached)
    return err(
      new AppError('conflict', 'Reload the organisation and try again'),
    );
  await cleanLogo(
    services,
    organisationLogoKey(input.organisationId, current.logo),
  );
  logger.info('organisation.logo_changed', {
    organisationId: current.id,
    marketCode: current.marketCode,
  });
  return ok({ logo });
};
