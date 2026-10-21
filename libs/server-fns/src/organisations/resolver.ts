import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  createOrganisationApplication,
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
  readonly createdAt: Date;
  readonly role: string;
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
  createdAt: row.createdAt,
  role,
});

/** A city code is optional, and when given has to be a city of the organisation's market. */
const checkCity = (
  marketCode: string,
  cityCode: string | null | undefined,
): AppError | null =>
  cityCode && !geo.findCity(marketCode, cityCode)
    ? new AppError('validation_failed', 'Choose a city in this market')
    : null;

/**
 * File an application for an organisation, with the applicant as its owner (B-ORG-04).
 *
 * Anyone signed in may apply, in a market that has switched hackathons on; the organisation starts
 * `pending` and can do nothing until an admin approves it (B-ORG-06). A slug another organisation
 * holds is refused with `organisation_slug_taken`, and nothing is written.
 */
export const applyForOrganisationResolver = async (
  db: Db,
  userId: string,
  application: organisations.OrganisationApplication,
): Promise<Result<OrganisationView>> => {
  const closed = await requireHackathonsEnabled(db, application.marketCode);
  if (closed) return err(closed);
  const city = checkCity(application.marketCode, application.cityCode);
  if (city) return err(city);
  const created = await createOrganisationApplication(db, {
    organisation: { id: id('org'), ...application },
    memberId: id('mem'),
    userId,
  });
  if (!created) {
    logger.warn('organisation.apply_refused', {
      marketCode: application.marketCode,
      code: 'organisation_slug_taken',
    });
    return err(
      new AppError(
        'organisation_slug_taken',
        'Another organisation already uses this address',
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
