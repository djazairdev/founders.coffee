import { and, eq, sql, type SQL } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { hackathons, hackathonTeamMembers, hackathonTeams } from './schema.js';

const isChanged = (result: unknown): boolean =>
  ((result as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0;

/** Whether the hackathon's submission deadline is still ahead, so teams can still change. */
const teamsOpen = (eventId: string): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathons} WHERE ${hackathons.eventId} = ${eventId} AND ${hackathons.submissionDeadlineAt} > unixepoch())`;

/** The team the member captains in the hackathon. */
const captainsTeam = (eventId: string, captainId: string): SQL =>
  sql`(SELECT captain.team_id FROM ${hackathonTeamMembers} captain WHERE captain.event_id = ${eventId} AND captain.user_id = ${captainId} AND captain.is_captain = 1)`;

/**
 * Leave a team (B-TEAM-06), in one atomic batch. A member leaves while teams can still change; the
 * captain only when they are its last member, and the team, empty then, is deleted with its links,
 * requests and draft. Returns whether the member left.
 */
export const leaveTeam = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly teamId: string;
    readonly userId: string;
  },
): Promise<boolean> => {
  const [left] = await batch(db, [
    db
      .delete(hackathonTeamMembers)
      .where(
        and(
          eq(hackathonTeamMembers.teamId, input.teamId),
          eq(hackathonTeamMembers.eventId, input.eventId),
          eq(hackathonTeamMembers.userId, input.userId),
          sql`(${hackathonTeamMembers.isCaptain} = 0 OR (SELECT count(*) FROM ${hackathonTeamMembers} everyone WHERE everyone.team_id = ${input.teamId}) = 1)`,
          teamsOpen(input.eventId),
        ),
      ),
    db
      .delete(hackathonTeams)
      .where(
        and(
          eq(hackathonTeams.id, input.teamId),
          sql`changes() = 1`,
          sql`NOT EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${input.teamId})`,
        ),
      ),
  ]);
  return isChanged(left);
};

/**
 * Hand the captain's team to another of its members (B-TEAM-06), in one atomic batch. The captain
 * steps down only while the successor is another member of the same team and teams can still
 * change, and the successor steps up only when they did, so the team always has exactly one
 * captain, as the partial unique index holds. Returns whether the captaincy passed.
 */
export const passCaptaincy = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly captainId: string;
    readonly successorId: string;
  },
): Promise<boolean> => {
  const [, promoted] = await batch(db, [
    db
      .update(hackathonTeamMembers)
      .set({ isCaptain: false })
      .where(
        and(
          eq(hackathonTeamMembers.eventId, input.eventId),
          eq(hackathonTeamMembers.userId, input.captainId),
          eq(hackathonTeamMembers.isCaptain, true),
          sql`EXISTS (SELECT 1 FROM ${hackathonTeamMembers} successor WHERE successor.team_id = ${hackathonTeamMembers.teamId} AND successor.user_id = ${input.successorId} AND successor.is_captain = 0)`,
          teamsOpen(input.eventId),
        ),
      ),
    db
      .update(hackathonTeamMembers)
      .set({ isCaptain: true })
      .where(
        and(
          eq(hackathonTeamMembers.eventId, input.eventId),
          eq(hackathonTeamMembers.userId, input.successorId),
          sql`${hackathonTeamMembers.teamId} = (SELECT former.team_id FROM ${hackathonTeamMembers} former WHERE former.event_id = ${input.eventId} AND former.user_id = ${input.captainId})`,
          sql`changes() = 1`,
        ),
      ),
  ]);
  return isChanged(promoted);
};

/**
 * Remove another member from the captain's team (B-TEAM-06), while teams can still change. Never
 * the captain, who passes the captaincy on and leaves instead. Returns whether they were removed.
 */
export const removeTeamMember = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly captainId: string;
    readonly memberId: string;
  },
): Promise<boolean> =>
  isChanged(
    await db
      .delete(hackathonTeamMembers)
      .where(
        and(
          eq(hackathonTeamMembers.eventId, input.eventId),
          eq(hackathonTeamMembers.userId, input.memberId),
          eq(hackathonTeamMembers.isCaptain, false),
          sql`${hackathonTeamMembers.teamId} = ${captainsTeam(input.eventId, input.captainId)}`,
          teamsOpen(input.eventId),
        ),
      ),
  );
