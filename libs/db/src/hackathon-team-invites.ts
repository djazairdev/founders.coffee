import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { bound } from './insert-select.js';
import {
  events,
  hackathonRegistrations,
  hackathons,
  hackathonTeamInvites,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
} from './schema.js';

type Captain = { readonly eventId: string; readonly userId: string };

export type TeamInviteRead = {
  readonly teamId: string;
  readonly eventId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly teamSize: number;
  readonly teamMax: number;
};

/** The team the member captains in the hackathon, while its submission deadline is ahead. */
const captainedTeam = (captain: Captain) =>
  sql`SELECT ${hackathonTeamMembers.teamId} FROM ${hackathonTeamMembers} JOIN ${hackathons} ON ${hackathons.eventId} = ${hackathonTeamMembers.eventId} WHERE ${hackathonTeamMembers.eventId} = ${captain.eventId} AND ${hackathonTeamMembers.userId} = ${captain.userId} AND ${hackathonTeamMembers.isCaptain} = 1 AND ${hackathons.submissionDeadlineAt} > unixepoch()`;

const turnOff = (db: Db, captain: Captain) =>
  db
    .update(hackathonTeamInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        sql`${hackathonTeamInvites.teamId} IN (${captainedTeam(captain)})`,
        isNull(hackathonTeamInvites.revokedAt),
      ),
    );

/**
 * Give the captain's team a new invite link (B-TEAM-04), in one atomic batch: the links it had stop
 * working, and the new one is written from the captain's own membership, so only a captain makes
 * one, and only before the submission deadline. A team has one working link at a time. Only the
 * token's hash is written. Returns whether the link was made.
 */
export const replaceTeamInvite = async (
  db: Db,
  input: Captain & {
    readonly id: string;
    readonly tokenHash: string;
    readonly expiresAt: Date;
  },
): Promise<boolean> => {
  const [, inserted] = await batch(db, [
    turnOff(db, input),
    db.insert(hackathonTeamInvites).select(
      db
        .select({
          id: bound(input.id, 'id'),
          teamId: hackathonTeamMembers.teamId,
          tokenHash: bound(input.tokenHash, 'token_hash'),
          createdBy: hackathonTeamMembers.userId,
          expiresAt: bound(
            Math.floor(input.expiresAt.getTime() / 1000),
            'expires_at',
          ),
          revokedAt: bound(null, 'revoked_at'),
          createdAt: sql`unixepoch()`.as('created_at'),
        })
        .from(hackathonTeamMembers)
        .where(
          sql`${hackathonTeamMembers.teamId} IN (${captainedTeam(input)}) AND ${hackathonTeamMembers.userId} = ${input.userId}`,
        ),
    ),
  ]);
  return ((inserted as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0;
};

/** Turn off the captain's team's invite links (B-TEAM-04). Returns how many stopped working. */
export const revokeTeamInvites = async (
  db: Db,
  captain: Captain,
): Promise<number> => {
  const result = await turnOff(db, captain);
  return (result.meta?.changes ?? 0) as number;
};

/** The invite link with this token hash, with its team's size and the hackathon's largest team. */
export const readTeamInvite = async (
  db: Db,
  tokenHash: string,
): Promise<TeamInviteRead | null> => {
  const [row] = await db
    .select({
      teamId: hackathonTeamInvites.teamId,
      eventId: hackathonTeams.eventId,
      expiresAt: hackathonTeamInvites.expiresAt,
      revokedAt: hackathonTeamInvites.revokedAt,
      teamSize: sql<number>`(SELECT count(*) FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${hackathonTeamInvites.teamId})`,
      teamMax: hackathons.teamMax,
    })
    .from(hackathonTeamInvites)
    .innerJoin(
      hackathonTeams,
      eq(hackathonTeams.id, hackathonTeamInvites.teamId),
    )
    .innerJoin(hackathons, eq(hackathons.eventId, hackathonTeams.eventId))
    .where(eq(hackathonTeamInvites.tokenHash, tokenHash));
  return row ? { ...row, teamSize: Number(row.teamSize) } : null;
};

/**
 * Whether the member may join through the link: it works, the hackathon is published and its
 * submission deadline ahead, the member holds a place and is in no team yet, and the team has room.
 */
const mayJoin = (userId: string): SQL =>
  sql`${hackathonTeamInvites.revokedAt} IS NULL AND ${hackathonTeamInvites.expiresAt} > unixepoch() AND ${events.status} = 'published' AND ${hackathons.submissionDeadlineAt} > unixepoch() AND EXISTS (SELECT 1 FROM ${hackathonRegistrations} WHERE ${hackathonRegistrations.eventId} = ${hackathonTeams.eventId} AND ${hackathonRegistrations.userId} = ${userId} AND ${hackathonRegistrations.status} = 'registered') AND NOT EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.eventId} = ${hackathonTeams.eventId} AND ${hackathonTeamMembers.userId} = ${userId}) AND (SELECT count(*) FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${hackathonTeams.id}) < ${hackathons.teamMax}`;

/**
 * Join a team through its invite link (B-TEAM-04), in one atomic batch (AGENTS.md §11).
 *
 * The membership is selected from the link only while {@link mayJoin} holds, which counts the team
 * in the same statement, so two members taking its last place at once get it once. The member's
 * pending requests to join teams in the hackathon are then cancelled, as when they start a team.
 * Returns whether they joined.
 */
export const joinTeamByInvite = async (
  db: Db,
  input: {
    readonly tokenHash: string;
    readonly eventId: string;
    readonly userId: string;
  },
): Promise<boolean> => {
  const [inserted] = await batch(db, [
    db.insert(hackathonTeamMembers).select(
      db
        .select({
          teamId: hackathonTeams.id,
          eventId: hackathonTeams.eventId,
          userId: bound(input.userId, 'user_id'),
          isCaptain: sql<number>`0`.as('is_captain'),
          joinedAt: sql`unixepoch()`.as('joined_at'),
        })
        .from(hackathonTeamInvites)
        .innerJoin(
          hackathonTeams,
          eq(hackathonTeams.id, hackathonTeamInvites.teamId),
        )
        .innerJoin(hackathons, eq(hackathons.eventId, hackathonTeams.eventId))
        .innerJoin(events, eq(events.id, hackathonTeams.eventId))
        .where(
          and(
            eq(hackathonTeamInvites.tokenHash, input.tokenHash),
            eq(hackathonTeams.eventId, input.eventId),
            mayJoin(input.userId),
          ),
        ),
    ),
    db
      .update(hackathonTeamRequests)
      .set({ status: 'cancelled', decidedAt: new Date() })
      .where(
        and(
          eq(hackathonTeamRequests.eventId, input.eventId),
          eq(hackathonTeamRequests.userId, input.userId),
          eq(hackathonTeamRequests.status, 'pending'),
          sql`changes() = 1`,
        ),
      ),
  ]);
  return ((inserted as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0;
};
