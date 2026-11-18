import { and, asc, eq, sql } from 'drizzle-orm';

import type {
  AuditAction,
  HackathonReviewStatus,
  Locale,
} from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { auditStatement } from './operations-audit.js';
import { eventOrganisers, events, hackathons, member, user } from './schema.js';

/** A hackathon's review status, or `null` when there is no such hackathon. */
export const readHackathonReviewStatus = async (
  db: Db,
  eventId: string,
): Promise<HackathonReviewStatus | null> => {
  const [row] = await db
    .select({ reviewStatus: hackathons.reviewStatus })
    .from(hackathons)
    .where(eq(hackathons.eventId, eventId));
  return row?.reviewStatus ?? null;
};

/**
 * Record an operator's decision on a hackathon, with its audit entry, in one batch (B-HKN-08).
 *
 * The review status and version move only from what the operator saw, and only while the event is
 * still an unpublished draft. Approving then publishes the event. Each statement after the first runs only when
 * the one before it changed a row (`changes()`), so a decision that did not happen leaves no trail
 * and one that did always has one. Returns whether the decision landed.
 */
export const decideHackathonReview = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly from: HackathonReviewStatus;
    readonly to: HackathonReviewStatus;
    readonly note: string | null;
    readonly action: AuditAction;
    readonly actorUserId: string;
    readonly accessSubject: string | null;
    readonly auditId: string;
  },
): Promise<boolean> => {
  const results = await batch(db, [
    db
      .update(hackathons)
      .set({
        reviewStatus: input.to,
        reviewNote: input.note,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hackathons.eventId, input.eventId),
          eq(hackathons.reviewStatus, input.from),
          sql`EXISTS (SELECT 1 FROM ${events} WHERE ${events.id} = ${input.eventId} AND ${events.status} = 'draft' AND ${events.version} = ${input.version})`,
        ),
      ),
    db
      .update(events)
      .set({
        ...(input.to === 'approved' ? { status: 'published' as const } : {}),
        version: sql`${events.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(events.id, input.eventId), sql`changes() = 1`))
      .returning({ id: events.id }),
    auditStatement(
      db,
      {
        id: input.auditId,
        actorUserId: input.actorUserId,
        accessSubject: input.accessSubject,
        action: input.action,
        targetType: 'hackathon',
        targetId: input.eventId,
        reasonCode: null,
        metadata: { from: input.from, to: input.to },
      },
      events,
      events.marketCode,
      and(eq(events.id, input.eventId), sql`changes() = 1`),
    ),
  ]);
  return (results[1] as readonly { id: string }[]).length === 1;
};

export type HackathonOrganiserContact = {
  readonly userId: string;
  readonly email: string;
  readonly localePref: Locale | null;
};

/**
 * Who to tell about a review decision (B-HKN-08): the member who created the hackathon and the
 * owners of the organisation that leads it, each once, with their language.
 */
export const listHackathonOrganiserContacts = async (
  db: Db,
  eventId: string,
): Promise<HackathonOrganiserContact[]> => {
  const owners = db
    .select({ userId: member.userId })
    .from(member)
    .innerJoin(
      eventOrganisers,
      and(
        eq(eventOrganisers.organisationId, member.organizationId),
        eq(eventOrganisers.eventId, eventId),
        eq(eventOrganisers.role, 'lead'),
      ),
    )
    .where(eq(member.role, 'owner'));
  const creator = db
    .select({ userId: events.hostId })
    .from(events)
    .where(eq(events.id, eventId));
  return db
    .selectDistinct({
      userId: user.id,
      email: user.email,
      localePref: user.localePref,
    })
    .from(user)
    .where(sql`${user.id} IN (${owners}) OR ${user.id} IN (${creator})`)
    .orderBy(asc(user.email));
};
