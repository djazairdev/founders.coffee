import { and, asc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import type {
  AuditAction,
  HackathonReviewStatus,
  Locale,
} from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { hackathonAtVersion } from './hackathon-edits.js';
import { auditStatement } from './operations-audit.js';
import {
  eventOrganisers,
  events,
  hackathonCriteria,
  hackathons,
  hackathonTracks,
  markets,
  member,
  organization,
  user,
  type Hackathon,
} from './schema.js';

export const HACKATHON_REVIEW_PAGE = 50;

export type HackathonForReview = {
  readonly event: {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly marketCode: string;
    readonly cityCode: string;
    readonly startsAt: Date;
    readonly endsAt: Date | null;
  };
  readonly organisation: { readonly name: string; readonly slug: string };
  readonly details: Hackathon;
  readonly timeZone: string;
  readonly trackTitles: readonly string[];
};

export type HackathonReviewPage = {
  readonly items: HackathonForReview[];
  readonly hasMore: boolean;
};

/**
 * Whether a hackathon has what review needs (B-HKN-08), in SQL: at least one track, and three or
 * four criteria whose weights add up to 100. The details row is the statement's own.
 */
const isReady = (eventId: string): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathonTracks} WHERE ${hackathonTracks.eventId} = ${eventId}) AND (SELECT count(*) FROM ${hackathonCriteria} WHERE ${hackathonCriteria.eventId} = ${eventId}) BETWEEN 3 AND 4 AND (SELECT sum(${hackathonCriteria.weight}) FROM ${hackathonCriteria} WHERE ${hackathonCriteria.eventId} = ${eventId}) = 100`;

/**
 * Send a hackathon for review (B-HKN-08) in one batch: a draft, or one sent back, of an unpublished
 * event, complete, at the version the organisers saw, which then moves on. Any note from an earlier
 * review goes, since the reviewers will write a new one.
 *
 * This cannot be an edit of {@link applyHackathonEdit}, whose version bump re-checks that the
 * hackathon is not with the reviewers and would refuse the very write before it. The status write
 * carries {@link hackathonAtVersion} itself, and the bump follows only when it changed the row.
 * Returns the new version, or `null` when nothing landed.
 */
export const submitHackathonForReview = async (
  db: Db,
  input: { readonly eventId: string; readonly version: number },
): Promise<number | null> => {
  const next = input.version + 1;
  const results = await batch(db, [
    db
      .update(hackathons)
      .set({
        reviewStatus: 'submitted',
        reviewNote: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hackathons.eventId, input.eventId),
          inArray(hackathons.reviewStatus, ['draft', 'rejected']),
          sql`EXISTS (SELECT 1 FROM ${events} WHERE ${events.id} = ${input.eventId} AND ${events.status} = 'draft')`,
          hackathonAtVersion(input.eventId, input.version),
          isReady(input.eventId),
        ),
      ),
    db
      .update(events)
      .set({ version: next, updatedAt: new Date() })
      .where(and(eq(events.id, input.eventId), sql`changes() = 1`))
      .returning({ version: events.version }),
  ]);
  return (results[1] as readonly { version: number }[]).length === 1
    ? next
    : null;
};

/**
 * One page of the hackathons waiting for review (B-HKN-08), the one sent longest ago first, each
 * with its lead organisation, its market's time zone and its tracks' titles. Reads one row past the
 * page to say whether another follows.
 */
export const listHackathonsForReview = async (
  db: Db,
  page = 0,
): Promise<HackathonReviewPage> => {
  const rows = await db
    .select({
      event: {
        id: events.id,
        title: events.title,
        description: events.description,
        marketCode: events.marketCode,
        cityCode: events.cityCode,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
      },
      organisation: { name: organization.name, slug: organization.slug },
      details: hackathons,
      timeZone: markets.timezone,
    })
    .from(hackathons)
    .innerJoin(events, eq(events.id, hackathons.eventId))
    .innerJoin(
      eventOrganisers,
      and(
        eq(eventOrganisers.eventId, events.id),
        eq(eventOrganisers.role, 'lead'),
      ),
    )
    .innerJoin(
      organization,
      eq(organization.id, eventOrganisers.organisationId),
    )
    .innerJoin(markets, eq(markets.code, events.marketCode))
    .where(eq(hackathons.reviewStatus, 'submitted'))
    .orderBy(asc(hackathons.updatedAt), asc(hackathons.eventId))
    .limit(HACKATHON_REVIEW_PAGE + 1)
    .offset(page * HACKATHON_REVIEW_PAGE);
  const shown = rows.slice(0, HACKATHON_REVIEW_PAGE);
  const tracks =
    shown.length === 0
      ? []
      : await db
          .select({
            eventId: hackathonTracks.eventId,
            title: hackathonTracks.title,
          })
          .from(hackathonTracks)
          .where(
            inArray(
              hackathonTracks.eventId,
              shown.map((row) => row.event.id),
            ),
          )
          .orderBy(asc(hackathonTracks.position));
  return {
    items: shown.map((row) => ({
      ...row,
      trackTitles: tracks
        .filter((track) => track.eventId === row.event.id)
        .map((track) => track.title),
    })),
    hasMore: rows.length > HACKATHON_REVIEW_PAGE,
  };
};

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
 * The review status moves only from the one the operator saw, and only while the event is still an
 * unpublished draft. Approving then publishes the event; either decision moves its version on, so
 * an organiser's page built before it saves nothing. Each statement after the first runs only when
 * the one before it changed a row (`changes()`), so a decision that did not happen leaves no trail
 * and one that did always has one. Returns whether the decision landed.
 */
export const decideHackathonReview = async (
  db: Db,
  input: {
    readonly eventId: string;
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
          sql`EXISTS (SELECT 1 FROM ${events} WHERE ${events.id} = ${input.eventId} AND ${events.status} = 'draft')`,
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
    .selectDistinct({ email: user.email, localePref: user.localePref })
    .from(user)
    .where(sql`${user.id} IN (${owners}) OR ${user.id} IN (${creator})`)
    .orderBy(asc(user.email));
};
