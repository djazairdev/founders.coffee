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

export type MentorNoteWrite = {
  readonly helpsWith: string;
  readonly officeHours: string | null;
};

export type PublicHackathonMentor = {
  readonly userId: string;
  readonly name: string;
  readonly photoAssetId: string | null;
  readonly helpsWith: string | null;
  readonly officeHours: string | null;
};

export type OrganiserHackathonMentor = OrganiserPlace & {
  readonly helpsWith: string | null;
  readonly officeHours: string | null;
};

/**
 * Add a mentor's place to a hackathon as an invite link (B-HKN-25), in one statement, while it has
 * fewer than `limit` mentors invited or accepted, as judges' places are added. Only the token's
 * hash is written. Returns whether the place was added.
 */
export const addHackathonMentorInvite = async (
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
    await db.insert(hackathonMentors).select(
      db
        .select({
          id: bound(input.id, 'id'),
          eventId: hackathons.eventId,
          userId: bound(null, 'user_id'),
          status: bound('invited', 'status'),
          tokenHash: bound(input.tokenHash, 'token_hash'),
          invitedBy: bound(input.invitedBy, 'invited_by'),
          helpsWith: bound(null, 'helps_with'),
          officeHours: bound(null, 'office_hours'),
          respondedAt: bound(null, 'responded_at'),
          createdAt: sql`unixepoch()`.as('created_at'),
          updatedAt: sql`unixepoch()`.as('updated_at'),
        })
        .from(hackathons)
        .where(
          and(
            eq(hackathons.eventId, input.eventId),
            sql`${openPlacesCount(hackathonMentors, input.eventId)} < ${input.limit}`,
          ),
        ),
    ),
  );

/** The mentor's place an invite link with this token hash is for, whatever its status. */
export const readHackathonMentorInvite = (db: Db, tokenHash: string) =>
  readPlaceInvite(db, hackathonMentors, tokenHash);

/** How many of a hackathon's mentor places are invited or accepted. */
export const countOpenMentorPlaces = (db: Db, eventId: string) =>
  countOpenPlaces(db, hackathonMentors, eventId);

/** The status of the place the member holds among a hackathon's mentors, or `null` for none. */
export const readHeldMentorPlace = (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
) => readHeldPlace(db, hackathonMentors, input);

/**
 * Accept a mentor's invite link with what the member helps with (B-HKN-25), in one statement:
 * only while it is still invited, the member holds no other mentor's place in the hackathon, and
 * has not accepted a judge's place in it. Returns whether they became a mentor.
 */
export const acceptHackathonMentorInvite = (
  db: Db,
  input: {
    readonly tokenHash: string;
    readonly userId: string;
    readonly note: MentorNoteWrite;
  },
) =>
  acceptPlaceInvite(db, hackathonMentors, hackathonJudges, {
    tokenHash: input.tokenHash,
    userId: input.userId,
    extra: input.note,
  });

/** Decline a mentor's invite link (B-HKN-25) while it is still invited, keeping no account. */
export const declineHackathonMentorInvite = (db: Db, tokenHash: string) =>
  declinePlaceInvite(db, hackathonMentors, tokenHash);

/** Remove a mentor's place, or the link nobody answered (B-HKN-25). */
export const removeHackathonMentor = (
  db: Db,
  input: { readonly eventId: string; readonly mentorId: string },
) =>
  removePlace(db, hackathonMentors, {
    eventId: input.eventId,
    placeId: input.mentorId,
  });

/**
 * Change what an accepted mentor helps with and their office hours (B-HKN-25). Returns whether the
 * member holds an accepted mentor's place in the hackathon.
 */
export const saveHackathonMentorNote = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly userId: string;
    readonly note: MentorNoteWrite;
  },
): Promise<boolean> =>
  changed(
    await db
      .update(hackathonMentors)
      .set({ ...input.note, updatedAt: new Date() })
      .where(
        and(
          eq(hackathonMentors.eventId, input.eventId),
          eq(hackathonMentors.userId, input.userId),
          eq(hackathonMentors.status, 'accepted'),
        ),
      ),
  );

/**
 * Every mentor's place in a hackathon for its organisers (B-HKN-25), oldest first, with who
 * accepted it, what they help with and their office hours, in one trip.
 */
export const listOrganiserHackathonMentors = async (
  db: Db,
  eventId: string,
): Promise<OrganiserHackathonMentor[]> => {
  const [places, notes] = await db.batch([
    organiserPlacesQuery(db, hackathonMentors, eventId),
    db
      .select({
        id: hackathonMentors.id,
        helpsWith: hackathonMentors.helpsWith,
        officeHours: hackathonMentors.officeHours,
      })
      .from(hackathonMentors)
      .where(eq(hackathonMentors.eventId, eventId)),
  ]);
  const noteOf = new Map(notes.map((note) => [note.id, note]));
  return places.map((place) => ({
    ...place,
    helpsWith: noteOf.get(place.id)?.helpsWith ?? null,
    officeHours: noteOf.get(place.id)?.officeHours ?? null,
  }));
};

/**
 * The mentors a hackathon's page shows (B-HKN-26): those who accepted, in the order they did, with
 * what they help with and their office hours, each while their identity may still be shown
 * publicly. `eventId` may be SQL that yields the id, as for the judges.
 */
export const acceptedHackathonMentorsQuery = (db: Db, eventId: string | SQL) =>
  db
    .select({
      userId: user.id,
      name: user.name,
      photoAssetId: memberProfiles.photoAssetId,
      helpsWith: hackathonMentors.helpsWith,
      officeHours: hackathonMentors.officeHours,
    })
    .from(hackathonMentors)
    .innerJoin(user, eq(user.id, hackathonMentors.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, user.id))
    .where(
      and(
        eq(hackathonMentors.eventId, eventId),
        eq(hackathonMentors.status, 'accepted'),
        visibleIdentity(hackathonMentors.userId),
      ),
    )
    .orderBy(
      asc(hackathonMentors.respondedAt),
      asc(addedOrder(hackathonMentors)),
    );
