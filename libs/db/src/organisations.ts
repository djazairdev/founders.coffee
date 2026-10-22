import { and, desc, eq, sql } from 'drizzle-orm';

import type { OrganisationStatus } from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import {
  markets,
  member,
  organization,
  type NewOrganization,
  type Organization,
} from './schema.js';

/**
 * A user's membership of an organisation, with the organisation's review status, in one read; null
 * when the user is not a member or there is no such organisation, which callers must not tell apart.
 */
export const readOrganisationMembership = async (
  db: Db,
  input: { organisationId: string; userId: string },
): Promise<{ status: OrganisationStatus; role: string } | null> => {
  const [row] = await db
    .select({ status: organization.status, role: member.role })
    .from(organization)
    .innerJoin(
      member,
      and(
        eq(member.organizationId, organization.id),
        eq(member.userId, input.userId),
      ),
    )
    .where(eq(organization.id, input.organisationId))
    .limit(1);
  return row ?? null;
};

/**
 * File an application: the organisation as `pending`, with the applicant as its owner, in one batch.
 *
 * The owner row is selected from the organisation's own row, so a slug that was already taken
 * writes neither and the caller gets `undefined`; there is never an organisation without its owner.
 */
export const createOrganisationApplication = async (
  db: Db,
  input: {
    readonly organisation: Omit<NewOrganization, 'status' | 'ownerLeftAt'>;
    readonly memberId: string;
    readonly userId: string;
  },
): Promise<Organization | undefined> => {
  const [created] = await batch(db, [
    db
      .insert(organization)
      .values({ ...input.organisation, status: 'pending' })
      .onConflictDoNothing({ target: organization.slug })
      .returning(),
    db.insert(member).select(
      db
        .select({
          id: sql<string>`${input.memberId}`.as('id'),
          organizationId: organization.id,
          userId: sql<string>`${input.userId}`.as('user_id'),
          role: sql<'owner'>`'owner'`.as('role'),
          createdAt: sql`unixepoch()`.as('created_at'),
        })
        .from(organization)
        .where(eq(organization.id, input.organisation.id)),
    ),
  ]);
  return (created as Organization[])[0];
};

export type MyOrganisation = Organization & { readonly role: string };

/**
 * The organisations a user belongs to, newest first, with their role in each, in markets that have
 * switched hackathons on: where the flag is off, organisations are closed with the rest of Stage B.
 */
export const listOrganisationsOfUser = async (
  db: Db,
  userId: string,
): Promise<MyOrganisation[]> => {
  const rows = await db
    .select({ organisation: organization, role: member.role })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .innerJoin(markets, eq(markets.code, organization.marketCode))
    .where(
      and(
        eq(member.userId, userId),
        sql`json_type(${markets.featureFlags}, '$.hackathons') = 'true'`,
      ),
    )
    .orderBy(desc(organization.createdAt), organization.id);
  return rows.map(({ organisation, role }) => ({ ...organisation, role }));
};

/**
 * The organisation with this slug, with the user's role in it, when the user belongs to it and its
 * market has switched hackathons on; null otherwise, and callers must not tell the cases apart.
 */
export const readMyOrganisationBySlug = async (
  db: Db,
  input: { readonly slug: string; readonly userId: string },
): Promise<MyOrganisation | null> => {
  const [row] = await db
    .select({ organisation: organization, role: member.role })
    .from(organization)
    .innerJoin(
      member,
      and(
        eq(member.organizationId, organization.id),
        eq(member.userId, input.userId),
      ),
    )
    .innerJoin(markets, eq(markets.code, organization.marketCode))
    .where(
      and(
        eq(organization.slug, input.slug),
        sql`json_type(${markets.featureFlags}, '$.hackathons') = 'true'`,
      ),
    )
    .limit(1);
  return row ? { ...row.organisation, role: row.role } : null;
};

/** An organisation by id, or `null`. */
export const getOrganisation = async (
  db: Db,
  organisationId: string,
): Promise<Organization | null> => {
  const [row] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, organisationId))
    .limit(1);
  return row ?? null;
};

/** Change an organisation's public profile; its slug, kind, market and status never change here. */
export const updateOrganisationProfile = async (
  db: Db,
  organisationId: string,
  changes: Partial<
    Pick<Organization, 'name' | 'cityCode' | 'description' | 'websiteUrl'>
  >,
): Promise<Organization | null> => {
  const [row] = await db
    .update(organization)
    .set(changes)
    .where(eq(organization.id, organisationId))
    .returning();
  return row ?? null;
};
