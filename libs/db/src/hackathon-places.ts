import { and, asc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import type { HackathonJudgeStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import { hackathonJudges, hackathonMentors, user } from './schema.js';

export type PlaceTable = typeof hackathonJudges | typeof hackathonMentors;

export const OPEN_PLACES = ['invited', 'accepted'] as const;

export type PlaceInviteRead = {
  readonly id: string;
  readonly eventId: string;
  readonly status: HackathonJudgeStatus;
  readonly userId: string | null;
};

export type OrganiserPlace = {
  readonly id: string;
  readonly status: HackathonJudgeStatus;
  readonly userId: string | null;
  readonly name: string | null;
  readonly createdAt: Date;
  readonly respondedAt: Date | null;
};

/** The order places were added in, which breaks ties between places made in the same second. */
export const addedOrder = (table: PlaceTable): SQL => sql`${table}.rowid`;

export const changed = (result: { meta?: { changes?: number } }): boolean =>
  (result.meta?.changes ?? 0) > 0;

/** How many of a hackathon's places in this table are invited or accepted, as a subquery. */
export const openPlacesCount = (table: PlaceTable, eventId: string): SQL =>
  sql`(SELECT count(*) FROM ${table} WHERE ${table.eventId} = ${eventId} AND ${inArray(table.status, [...OPEN_PLACES])})`;

/** The place an invite link with this token hash is for, whatever its status. */
export const readPlaceInvite = async (
  db: Db,
  table: PlaceTable,
  tokenHash: string,
): Promise<PlaceInviteRead | null> => {
  const [row] = await db
    .select({
      id: table.id,
      eventId: table.eventId,
      status: table.status,
      userId: table.userId,
    })
    .from(table)
    .where(eq(table.tokenHash, tokenHash));
  return row ?? null;
};

/** How many of a hackathon's places in this table are invited or accepted. */
export const countOpenPlaces = async (
  db: Db,
  table: PlaceTable,
  eventId: string,
): Promise<number> => {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(table)
    .where(
      and(eq(table.eventId, eventId), inArray(table.status, [...OPEN_PLACES])),
    );
  return Number(row?.total ?? 0);
};

/** The status of the place the member holds in this table for a hackathon, or `null` for none. */
export const readHeldPlace = async (
  db: Db,
  table: PlaceTable,
  input: { readonly eventId: string; readonly userId: string },
): Promise<HackathonJudgeStatus | null> => {
  const [row] = await db
    .select({ status: table.status })
    .from(table)
    .where(
      and(eq(table.eventId, input.eventId), eq(table.userId, input.userId)),
    );
  return row?.status ?? null;
};

/**
 * Whether the member holds a place in `held` for the hackathon the link in `invites` is for: in
 * any status when both are the same table, and accepted when `held` is the other role's.
 */
const holdsPlace = (
  invites: PlaceTable,
  held: PlaceTable,
  input: { readonly tokenHash: string; readonly userId: string },
): SQL =>
  sql`EXISTS (SELECT 1 FROM ${held} AS held WHERE held.user_id = ${input.userId} ${held === invites ? sql`` : sql`AND held.status = 'accepted' `}AND held.event_id = (SELECT invite.event_id FROM ${invites} AS invite WHERE invite.token_hash = ${input.tokenHash}))`;

/**
 * Accept an invite link as the member, in one statement: the place takes their account only while
 * it is still invited, they hold no other place in it, which the unique index on the hackathon and
 * the member would otherwise refuse with an error, and they have not accepted the other role's
 * place in the same hackathon (B-HKN-25). `extra` fills the role's own columns. Returns whether
 * they accepted.
 */
export const acceptPlaceInvite = async (
  db: Db,
  table: PlaceTable,
  other: PlaceTable,
  input: {
    readonly tokenHash: string;
    readonly userId: string;
    readonly extra?: {
      readonly helpsWith: string;
      readonly officeHours: string | null;
    };
  },
): Promise<boolean> =>
  changed(
    await db
      .update(table)
      .set({
        ...input.extra,
        userId: input.userId,
        status: 'accepted',
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(table.tokenHash, input.tokenHash),
          eq(table.status, 'invited'),
          sql`NOT ${holdsPlace(table, table, input)}`,
          sql`NOT ${holdsPlace(table, other, input)}`,
        ),
      ),
  );

/**
 * Decline an invite link while it is still invited. The place keeps no account, so the member who
 * declined can still accept another link to the same hackathon later. Returns whether it was
 * declined.
 */
export const declinePlaceInvite = async (
  db: Db,
  table: PlaceTable,
  tokenHash: string,
): Promise<boolean> =>
  changed(
    await db
      .update(table)
      .set({
        status: 'declined',
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(table.tokenHash, tokenHash), eq(table.status, 'invited'))),
  );

/**
 * Remove a place from a hackathon: an invite link stops working and a member who accepted it no
 * longer holds it. The row stays as `removed`. Returns whether a place invited or accepted was
 * removed.
 */
export const removePlace = async (
  db: Db,
  table: PlaceTable,
  input: { readonly eventId: string; readonly placeId: string },
): Promise<boolean> =>
  changed(
    await db
      .update(table)
      .set({ status: 'removed', updatedAt: new Date() })
      .where(
        and(
          eq(table.id, input.placeId),
          eq(table.eventId, input.eventId),
          inArray(table.status, [...OPEN_PLACES]),
        ),
      ),
  );

/**
 * Every place in a hackathon for its organisers, oldest first, with the name of the member who
 * accepted it. A removed place is left out; a declined one stays, so organisers see the answer.
 */
export const organiserPlacesQuery = (
  db: Db,
  table: PlaceTable,
  eventId: string,
) =>
  db
    .select({
      id: table.id,
      status: table.status,
      userId: table.userId,
      name: user.name,
      createdAt: table.createdAt,
      respondedAt: table.respondedAt,
    })
    .from(table)
    .leftJoin(user, eq(user.id, table.userId))
    .where(
      and(
        eq(table.eventId, eventId),
        inArray(table.status, ['invited', 'accepted', 'declined']),
      ),
    )
    .orderBy(asc(table.createdAt), asc(addedOrder(table)));
