import { and, desc, eq, ne, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  hackathonRegistrations,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
  user,
} from './schema.js';

export type LookingTeam = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly size: number;
};

export type LookingParticipant = {
  readonly userId: string;
  readonly name: string;
  readonly skills: string | null;
};

export type LookingForTeam = {
  readonly teams: readonly LookingTeam[];
  readonly hasMoreTeams: boolean;
  readonly participants: readonly LookingParticipant[];
  readonly hasMoreParticipants: boolean;
  readonly requestedTeamIds: readonly string[];
};

/**
 * Who is looking for whom in a hackathon (B-TEAM-08), in one trip to D1: the teams that asked for
 * members and still have room, other than the viewer's own, and the registered participants who
 * asked for a team and are in none, other than the viewer, newest first and at most `limit` of each.
 * It also gives the teams the viewer is waiting to hear back from.
 */
export const readLookingForTeam = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly userId: string;
    readonly teamMax: number;
    readonly limit: number;
  },
): Promise<LookingForTeam> => {
  const { eventId, userId, teamMax, limit } = input;
  const size = sql<number>`(SELECT count(*) FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${hackathonTeams.id})`;
  const [teams, participants, requests] = await db.batch([
    db
      .select({
        id: hackathonTeams.id,
        name: hackathonTeams.name,
        description: hackathonTeams.description,
        size,
      })
      .from(hackathonTeams)
      .where(
        and(
          eq(hackathonTeams.eventId, eventId),
          eq(hackathonTeams.isLookingForMembers, true),
          sql`${size} < ${teamMax}`,
          sql`NOT EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${hackathonTeams.id} AND ${hackathonTeamMembers.userId} = ${userId})`,
        ),
      )
      .orderBy(desc(hackathonTeams.createdAt), desc(hackathonTeams.id))
      .limit(limit + 1),
    db
      .select({
        userId: hackathonRegistrations.userId,
        name: user.name,
        skills: hackathonRegistrations.skills,
      })
      .from(hackathonRegistrations)
      .innerJoin(user, eq(user.id, hackathonRegistrations.userId))
      .where(
        and(
          eq(hackathonRegistrations.eventId, eventId),
          eq(hackathonRegistrations.status, 'registered'),
          eq(hackathonRegistrations.isLookingForTeam, true),
          ne(hackathonRegistrations.userId, userId),
          sql`NOT EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.eventId} = ${hackathonRegistrations.eventId} AND ${hackathonTeamMembers.userId} = ${hackathonRegistrations.userId})`,
        ),
      )
      .orderBy(
        desc(hackathonRegistrations.createdAt),
        desc(hackathonRegistrations.id),
      )
      .limit(limit + 1),
    db
      .select({ teamId: hackathonTeamRequests.teamId })
      .from(hackathonTeamRequests)
      .where(
        and(
          eq(hackathonTeamRequests.eventId, eventId),
          eq(hackathonTeamRequests.userId, userId),
          eq(hackathonTeamRequests.status, 'pending'),
        ),
      ),
  ]);
  return {
    teams: teams
      .slice(0, limit)
      .map((team) => ({ ...team, size: Number(team.size) })),
    hasMoreTeams: teams.length > limit,
    participants: participants.slice(0, limit),
    hasMoreParticipants: participants.length > limit,
    requestedTeamIds: requests.map((request) => request.teamId),
  };
};
