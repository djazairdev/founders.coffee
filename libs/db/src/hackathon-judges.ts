import { and, asc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import type { HackathonJudgeStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import { bound } from './insert-select.js';
import { visibleIdentity } from './profile-access.js';
import { hackathonJudges, hackathons, memberProfiles, user } from './schema.js';

const OPEN_PLACES = ['invited', 'accepted'] as const;

export type HackathonJudgeInviteRead = {
  readonly id: string;
  readonly eventId: string;
  readonly status: HackathonJudgeStatus;
  readonly userId: string | null;
};

export type OrganiserHackathonJudge = {
  readonly id: string;
  readonly status: HackathonJudgeStatus;
  readonly userId: string | null;
  readonly name: string | null;
  readonly createdAt: Date;
  readonly respondedAt: Date | null;
};

export type PublicHackathonJudge = {
  readonly userId: string;
  readonly name: string;
  readonly photoAssetId: string | null;
};

const addedOrder = sql`${hackathonJudges}.rowid`;

const changed = (result: { meta?: { changes?: number } }): boolean =>
  (result.meta?.changes ?? 0) > 0;

/**
 * Add a judge's place to a hackathon as an invite link (B-JDG-03), in one statement: the row is
 * selected from the hackathon's details only while it has fewer than `limit` places invited or
 * accepted, so two organisers adding the last place at once add it once. Only the token's hash is
 * written. Returns whether the place was added.
 */
export const addHackathonJudgeInvite = async (
  db: Db,
  input: {
    readonly id: string;
    readonly eventId: string;
    readonly tokenHash: string;
    readonly invitedBy: string;
    readonly limit: number;
  },
): Promise<boolean> =>
  changed(
    await db.insert(hackathonJudges).select(
      db
        .select({
          id: bound(input.id, 'id'),
          eventId: hackathons.eventId,
          userId: bound(null, 'user_id'),
          status: bound('invited', 'status'),
          tokenHash: bound(input.tokenHash, 'token_hash'),
          invitedBy: bound(input.invitedBy, 'invited_by'),
          respondedAt: bound(null, 'responded_at'),
          createdAt: sql`unixepoch()`.as('created_at'),
          updatedAt: sql`unixepoch()`.as('updated_at'),
        })
        .from(hackathons)
        .where(
          and(
            eq(hackathons.eventId, input.eventId),
            sql`(SELECT count(*) FROM ${hackathonJudges} WHERE ${hackathonJudges.eventId} = ${input.eventId} AND ${inArray(hackathonJudges.status, [...OPEN_PLACES])}) < ${input.limit}`,
          ),
        ),
    ),
  );

/** The judge's place an invite link with this token hash is for, whatever its status. */
export const readHackathonJudgeInvite = async (
  db: Db,
  tokenHash: string,
): Promise<HackathonJudgeInviteRead | null> => {
  const [row] = await db
    .select({
      id: hackathonJudges.id,
      eventId: hackathonJudges.eventId,
      status: hackathonJudges.status,
      userId: hackathonJudges.userId,
    })
    .from(hackathonJudges)
    .where(eq(hackathonJudges.tokenHash, tokenHash));
  return row ?? null;
};

/** How many of a hackathon's judge places are invited or accepted. */
export const countOpenJudgePlaces = async (
  db: Db,
  eventId: string,
): Promise<number> => {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(hackathonJudges)
    .where(
      and(
        eq(hackathonJudges.eventId, eventId),
        inArray(hackathonJudges.status, [...OPEN_PLACES]),
      ),
    );
  return Number(row?.total ?? 0);
};

/** The status of the place the member holds among a hackathon's judges, or `null` for none. */
export const readHeldJudgePlace = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<HackathonJudgeStatus | null> => {
  const [row] = await db
    .select({ status: hackathonJudges.status })
    .from(hackathonJudges)
    .where(
      and(
        eq(hackathonJudges.eventId, input.eventId),
        eq(hackathonJudges.userId, input.userId),
      ),
    );
  return row?.status ?? null;
};

/** Whether the member already holds a place, in any status, in the hackathon the link is for. */
const holdsPlace = (tokenHash: string, userId: string): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathonJudges} AS held WHERE held.user_id = ${userId} AND held.event_id = (SELECT invite.event_id FROM ${hackathonJudges} AS invite WHERE invite.token_hash = ${tokenHash}))`;

/**
 * Accept an invite link as the member (B-JDG-03), in one statement: the place takes their account
 * only while it is still invited and they hold no other place in the hackathon, which is what the
 * unique index on the hackathon and the member would otherwise refuse with an error. Returns
 * whether they became a judge.
 */
export const acceptHackathonJudgeInvite = async (
  db: Db,
  input: { readonly tokenHash: string; readonly userId: string },
): Promise<boolean> =>
  changed(
    await db
      .update(hackathonJudges)
      .set({
        userId: input.userId,
        status: 'accepted',
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hackathonJudges.tokenHash, input.tokenHash),
          eq(hackathonJudges.status, 'invited'),
          sql`NOT ${holdsPlace(input.tokenHash, input.userId)}`,
        ),
      ),
  );

/**
 * Decline an invite link (B-JDG-03) while it is still invited. The place keeps no account, so the
 * member who declined can still accept another link to the same hackathon later. Returns whether
 * it was declined.
 */
export const declineHackathonJudgeInvite = async (
  db: Db,
  tokenHash: string,
): Promise<boolean> =>
  changed(
    await db
      .update(hackathonJudges)
      .set({
        status: 'declined',
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hackathonJudges.tokenHash, tokenHash),
          eq(hackathonJudges.status, 'invited'),
        ),
      ),
  );

/**
 * Remove a judge's place from a hackathon (B-JDG-03): an invite link stops working and an accepted
 * judge stops judging. The row stays, so the judge's scores and recusals remain reproducible.
 * Returns whether a place invited or accepted was removed.
 */
export const removeHackathonJudge = async (
  db: Db,
  input: { readonly eventId: string; readonly judgeId: string },
): Promise<boolean> =>
  changed(
    await db
      .update(hackathonJudges)
      .set({ status: 'removed', updatedAt: new Date() })
      .where(
        and(
          eq(hackathonJudges.id, input.judgeId),
          eq(hackathonJudges.eventId, input.eventId),
          inArray(hackathonJudges.status, [...OPEN_PLACES]),
        ),
      ),
  );

/**
 * Every judge's place in a hackathon for its organisers (B-JDG-03), oldest first, with the name of
 * the member who accepted it. A removed place is left out; a declined one stays, so organisers see
 * the answer.
 */
export const listOrganiserHackathonJudges = async (
  db: Db,
  eventId: string,
): Promise<OrganiserHackathonJudge[]> =>
  db
    .select({
      id: hackathonJudges.id,
      status: hackathonJudges.status,
      userId: hackathonJudges.userId,
      name: user.name,
      createdAt: hackathonJudges.createdAt,
      respondedAt: hackathonJudges.respondedAt,
    })
    .from(hackathonJudges)
    .leftJoin(user, eq(user.id, hackathonJudges.userId))
    .where(
      and(
        eq(hackathonJudges.eventId, eventId),
        inArray(hackathonJudges.status, ['invited', 'accepted', 'declined']),
      ),
    )
    .orderBy(asc(hackathonJudges.createdAt), asc(addedOrder));

/**
 * The judges a hackathon's page shows (B-JDG-03): those who accepted, in the order they did, each
 * while their identity may still be shown publicly. `eventId` may be SQL that yields the id, such
 * as the event a page reads by its address in the same batch.
 */
export const acceptedHackathonJudgesQuery = (db: Db, eventId: string | SQL) =>
  db
    .select({
      userId: user.id,
      name: user.name,
      photoAssetId: memberProfiles.photoAssetId,
    })
    .from(hackathonJudges)
    .innerJoin(user, eq(user.id, hackathonJudges.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, user.id))
    .where(
      and(
        eq(hackathonJudges.eventId, eventId),
        eq(hackathonJudges.status, 'accepted'),
        visibleIdentity(hackathonJudges.userId),
      ),
    )
    .orderBy(asc(hackathonJudges.respondedAt), asc(addedOrder));
