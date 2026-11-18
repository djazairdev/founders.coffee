import { and, asc, eq, sql } from 'drizzle-orm';

import type {
  AuditAction,
  Locale,
  OrganisationStatus,
} from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { auditStatement } from './operations-audit.js';
import {
  markets,
  member,
  organization,
  user,
  type Organization,
} from './schema.js';

export const ORGANISATION_REVIEW_PAGE = 50;

export type OrganisationForReview = Organization & {
  readonly ownerName: string | null;
  readonly timeZone: string;
};

export type OrganisationReviewPage = {
  readonly items: OrganisationForReview[];
  readonly hasMore: boolean;
};

/**
 * One page of the organisations in one status for the admin queue (B-ORG-06), oldest first, so the
 * application waiting longest is decided first, each with the name of its first owner. Reads one row
 * past the page to say whether another follows.
 */
export const listOrganisationsForReview = async (
  db: Db,
  status: OrganisationStatus,
  page = 0,
): Promise<OrganisationReviewPage> => {
  const firstOwner = db
    .select({ name: user.name })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(eq(member.organizationId, organization.id), eq(member.role, 'owner')),
    )
    .orderBy(asc(member.createdAt))
    .limit(1);
  const rows = await db
    .select({
      organisation: organization,
      ownerName: sql<string | null>`(${firstOwner})`,
      timeZone: markets.timezone,
    })
    .from(organization)
    .innerJoin(markets, eq(markets.code, organization.marketCode))
    .where(eq(organization.status, status))
    .orderBy(asc(organization.createdAt), asc(organization.id))
    .limit(ORGANISATION_REVIEW_PAGE + 1)
    .offset(page * ORGANISATION_REVIEW_PAGE);
  return {
    items: rows
      .slice(0, ORGANISATION_REVIEW_PAGE)
      .map(({ organisation, ownerName, timeZone }) => ({
        ...organisation,
        ownerName,
        timeZone,
      })),
    hasMore: rows.length > ORGANISATION_REVIEW_PAGE,
  };
};

/**
 * Record an operator's decision on an organisation, with its audit entry, in one batch.
 *
 * The status changes only from the one the operator saw (`from`), so two operators deciding at once
 * cannot both win, and the audit row is written only when the update changed the row: its select
 * reads `changes()`, the count of the statement before it. A decision that did not happen leaves no
 * trail, and one that did always has one. Returns the organisation as decided, or `null` when the
 * status had already moved.
 */
export const decideOrganisation = async (
  db: Db,
  input: {
    readonly organisationId: string;
    readonly from: OrganisationStatus;
    readonly to: OrganisationStatus;
    readonly note: string | null;
    readonly action: AuditAction;
    readonly actorUserId: string;
    readonly accessSubject: string | null;
    readonly auditId: string;
  },
): Promise<Organization | null> => {
  const [updated] = await batch(db, [
    db
      .update(organization)
      .set({ status: input.to, reviewNote: input.note, reviewedAt: new Date() })
      .where(
        and(
          eq(organization.id, input.organisationId),
          eq(organization.status, input.from),
        ),
      )
      .returning(),
    auditStatement(
      db,
      {
        id: input.auditId,
        actorUserId: input.actorUserId,
        accessSubject: input.accessSubject,
        action: input.action,
        targetType: 'organisation',
        targetId: input.organisationId,
        reasonCode: null,
        metadata: { from: input.from, to: input.to },
      },
      organization,
      organization.marketCode,
      and(eq(organization.id, input.organisationId), sql`changes() = 1`),
    ),
  ]);
  return (updated as Organization[])[0] ?? null;
};

export type OrganisationOwnerContact = {
  readonly email: string;
  readonly localePref: Locale | null;
};

/** Where to tell an organisation's owners about a decision: each owner's address and language. */
export const listOrganisationOwnerContacts = async (
  db: Db,
  organisationId: string,
): Promise<OrganisationOwnerContact[]> =>
  db
    .select({ email: user.email, localePref: user.localePref })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(eq(member.organizationId, organisationId), eq(member.role, 'owner')),
    );
