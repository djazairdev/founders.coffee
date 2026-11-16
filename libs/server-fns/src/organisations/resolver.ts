import { organisationRoleAllows } from '@founders-coffee/auth';
import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  deleteOrganisationIfUnused,
  getOrganisation,
  listOrganisationsOfUser,
  readOrganisationMembership,
  updateOrganisationProfile,
  type Db,
  type Organization,
} from '@founders-coffee/db';
import { geo, type organisations } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { requireHackathonsEnabled } from '../hackathons/flag.js';
import type { PhotoServices } from '../profile/photo.js';
import { createApplication } from './application.js';
import { cleanOrganisationLogo } from './logo.js';

export type OrganisationView = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly kind: Organization['kind'];
  readonly status: Organization['status'];
  readonly marketCode: string;
  readonly cityCode: string | null;
  readonly description: string;
  readonly websiteUrl: string | null;
  readonly logo: string | null;
  readonly createdAt: Date;
  readonly role: string;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
};

/** The fields a member sees of an organisation they belong to, with their role in it. */
const viewOf = (row: Organization, role: string): OrganisationView => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  kind: row.kind,
  status: row.status,
  marketCode: row.marketCode,
  cityCode: row.cityCode,
  description: row.description,
  websiteUrl: row.websiteUrl,
  logo: row.logo,
  createdAt: row.createdAt,
  role,
  canEdit:
    row.status === 'approved' &&
    organisationRoleAllows(role, 'organization', 'update'),
  canDelete:
    row.status === 'approved' &&
    organisationRoleAllows(role, 'organization', 'delete'),
});

/** A city code is optional, and when given has to be a city of the organisation's market. */
const checkCity = (
  marketCode: string,
  cityCode: string | null | undefined,
): AppError | null =>
  cityCode && !geo.findCity(marketCode, cityCode)
    ? new AppError('validation_failed', 'Choose a city in this market')
    : null;

/** Apply in Algeria with an allocated address and the applicant as owner (B-ORG-04). */
export const applyForOrganisationResolver = async (
  db: Db,
  userId: string,
  application: organisations.OrganisationApplication,
): Promise<Result<OrganisationView>> => {
  const marketCode = 'DZ';
  const closed = await requireHackathonsEnabled(db, marketCode);
  if (closed) return err(closed);
  const created = await createApplication(db, userId, application, marketCode);
  if (!created) {
    logger.warn('organisation.apply_refused', {
      marketCode,
      code: 'organisation_slug_taken',
    });
    return err(
      new AppError(
        'organisation_slug_taken',
        'Could not allocate an organisation address',
      ),
    );
  }
  logger.info('organisation.applied', {
    organisationId: created.id,
    marketCode: created.marketCode,
    kind: created.kind,
  });
  return ok(viewOf(created, 'owner'));
};

/** The organisations the member belongs to, in markets where hackathons are on, newest first. */
export const listMyOrganisationsResolver = async (
  db: Db,
  userId: string,
): Promise<Result<readonly OrganisationView[]>> => {
  const rows = await listOrganisationsOfUser(db, userId);
  logger.info('organisation.listed', { count: rows.length });
  return ok(rows.map((row) => viewOf(row, row.role)));
};

/**
 * Change an organisation's public profile: its name, city, description and website.
 *
 * Who may is decided before this runs, by `requireOrganisationPermission('organization',
 * 'update')`: an owner or admin of an approved organisation. The slug, kind, market and status are
 * not editable here; the address is what shared links point at, and the rest an admin approved.
 */
export const updateOrganisationResolver = async (
  db: Db,
  input: {
    readonly organisationId: string;
    readonly userId: string;
    readonly changes: organisations.OrganisationEdit;
  },
): Promise<Result<OrganisationView>> => {
  const [current, membership] = await Promise.all([
    getOrganisation(db, input.organisationId),
    readOrganisationMembership(db, {
      organisationId: input.organisationId,
      userId: input.userId,
    }),
  ]);
  if (!current || !membership)
    return err(new AppError('not_found', 'Organisation not found'));
  const closed = await requireHackathonsEnabled(db, current.marketCode);
  if (closed) return err(closed);
  const city = checkCity(current.marketCode, input.changes.cityCode);
  if (city) return err(city);
  const updated = await updateOrganisationProfile(
    db,
    input.organisationId,
    input.changes,
  );
  if (!updated) return err(new AppError('not_found', 'Organisation not found'));
  logger.info('organisation.updated', {
    organisationId: updated.id,
    marketCode: updated.marketCode,
    fields: Object.keys(input.changes),
  });
  return ok(viewOf(updated, membership.role));
};

/** Delete an unused organisation; linked event records keep their organiser intact (B-ORG-09). */
export const deleteOrganisationResolver = async (
  db: Db,
  services: PhotoServices | null,
  organisationId: string,
): Promise<Result<{ readonly id: string }>> => {
  const current = await getOrganisation(db, organisationId);
  if (!current)
    return err(
      new AppError('organisation_not_found', 'Organisation not found'),
    );
  if (current.kind === 'platform')
    return err(
      new AppError('forbidden', 'The platform organisation is protected'),
    );
  const closed = await requireHackathonsEnabled(db, current.marketCode);
  if (closed) return err(closed);
  const deleted = await deleteOrganisationIfUnused(db, current.id);
  if (!deleted) {
    const remaining = await getOrganisation(db, current.id);
    if (!remaining)
      return err(
        new AppError('organisation_not_found', 'Organisation not found'),
      );
    logger.info('organisation.delete_refused', {
      organisationId: current.id,
      marketCode: current.marketCode,
      code: 'organisation_has_events',
    });
    return err(
      new AppError(
        'organisation_has_events',
        'Remove the organisation from its events before deleting it',
      ),
    );
  }
  await cleanOrganisationLogo(services, current.id, current.logo);
  logger.info('organisation.deleted', {
    organisationId: current.id,
    marketCode: current.marketCode,
  });
  return ok({ id: current.id });
};
