import { and, asc, eq, sql, type SQL } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  acceptPlaceInvite,
  addedOrder,
  changed,
  countOpenPlaces,
  declinePlaceInvite,
  openPlacesCount,
  organiserPlacesQuery,
  readHeldPlace,
  readPlaceInvite,
  removePlace,
  type OrganiserPlace,
  type PlaceInviteRead,
} from './hackathon-places.js';
import { bound } from './insert-select.js';
import { visibleIdentity } from './profile-access.js';
import {
  hackathonJudges,
  hackathonMentors,
  hackathons,
  memberProfiles,
  user,
} from './schema.js';

export type HackathonJudgeInviteRead = PlaceInviteRead;

export type OrganiserHackathonJudge = OrganiserPlace;

export type PublicHackathonJudge = {
  readonly userId: string;
  readonly name: string;
  readonly photoAssetId: string | null;
};

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
            sql`${openPlacesCount(hackathonJudges, input.eventId)} < ${input.limit}`,
          ),
        ),
    ),
  );

/** The judge's place an invite link with this token hash is for, whatever its status. */
export const readHackathonJudgeInvite = (db: Db, tokenHash: string) =>
  readPlaceInvite(db, hackathonJudges, tokenHash);

/** How many of a hackathon's judge places are invited or accepted. */
export const countOpenJudgePlaces = (db: Db, eventId: string) =>
  countOpenPlaces(db, hackathonJudges, eventId);

/** The status of the place the member holds among a hackathon's judges, or `null` for none. */
export const readHeldJudgePlace = (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
) => readHeldPlace(db, hackathonJudges, input);

/**
 * Accept a judge's invite link as the member (B-JDG-03), in one statement: only while it is still
 * invited, the member holds no other judge's place in the hackathon, and does not mentor it
 * (B-HKN-25). Returns whether they became a judge.
 */
export const acceptHackathonJudgeInvite = (
  db: Db,
  input: { readonly tokenHash: string; readonly userId: string },
) => acceptPlaceInvite(db, hackathonJudges, hackathonMentors, input);

/**
 * Decline a judge's invite link (B-JDG-03) while it is still invited, keeping no account, so the
 * member can still accept another link to the same hackathon later. Returns whether it was
 * declined.
 */
export const declineHackathonJudgeInvite = (db: Db, tokenHash: string) =>
  declinePlaceInvite(db, hackathonJudges, tokenHash);

/**
 * Remove a judge's place from a hackathon (B-JDG-03): an invite link stops working and an accepted
 * judge stops judging. The row stays, so the judge's scores and recusals remain reproducible.
 * Returns whether a place invited or accepted was removed.
 */
export const removeHackathonJudge = (
  db: Db,
  input: { readonly eventId: string; readonly judgeId: string },
) =>
  removePlace(db, hackathonJudges, {
    eventId: input.eventId,
    placeId: input.judgeId,
  });

/**
 * Every judge's place in a hackathon for its organisers (B-JDG-03), oldest first, with the name of
 * the member who accepted it. A removed place is left out; a declined one stays.
 */
export const listOrganiserHackathonJudges = async (
  db: Db,
  eventId: string,
): Promise<OrganiserHackathonJudge[]> =>
  organiserPlacesQuery(db, hackathonJudges, eventId);

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
    .orderBy(
      asc(hackathonJudges.respondedAt),
      asc(addedOrder(hackathonJudges)),
    );
