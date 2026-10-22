import { and, asc, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  hackathonTeamInvites,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
  user,
} from './schema.js';

export type TeamPageMember = {
  readonly userId: string;
  readonly name: string | null;
  readonly isCaptain: boolean;
};

export type TeamPageRequest = {
  readonly id: string;
  readonly userId: string;
  readonly name: string | null;
  readonly createdAt: Date;
};

export type TeamPageOwnRequest = {
  readonly id: string;
  readonly teamId: string;
  readonly teamName: string;
  readonly createdAt: Date;
};

export type TeamPageTeam = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isLookingForMembers: boolean;
  readonly members: readonly TeamPageMember[];
  readonly requests: readonly TeamPageRequest[];
  readonly inviteExpiresAt: Date | null;
};

/**
 * The team a member is in, as their team page shows it (B-TEAM-07), in one trip to D1: the team,
 * its members captain first and then in the order they joined, the requests to join it still
 * waiting for an answer, and when its working invite link stops working, if it has one.
 */
export const readTeamPageTeam = async (
  db: Db,
  teamId: string,
  now: Date,
): Promise<TeamPageTeam | null> => {
  const [teams, members, requests, invites] = await db.batch([
    db
      .select({
        id: hackathonTeams.id,
        name: hackathonTeams.name,
        description: hackathonTeams.description,
        isLookingForMembers: hackathonTeams.isLookingForMembers,
      })
      .from(hackathonTeams)
      .where(eq(hackathonTeams.id, teamId)),
    db
      .select({
        userId: hackathonTeamMembers.userId,
        name: user.name,
        isCaptain: hackathonTeamMembers.isCaptain,
      })
      .from(hackathonTeamMembers)
      .leftJoin(user, eq(user.id, hackathonTeamMembers.userId))
      .where(eq(hackathonTeamMembers.teamId, teamId))
      .orderBy(
        desc(hackathonTeamMembers.isCaptain),
        asc(hackathonTeamMembers.joinedAt),
        asc(hackathonTeamMembers.userId),
      ),
    db
      .select({
        id: hackathonTeamRequests.id,
        userId: hackathonTeamRequests.userId,
        name: user.name,
        createdAt: hackathonTeamRequests.createdAt,
      })
      .from(hackathonTeamRequests)
      .leftJoin(user, eq(user.id, hackathonTeamRequests.userId))
      .where(
        and(
          eq(hackathonTeamRequests.teamId, teamId),
          eq(hackathonTeamRequests.status, 'pending'),
        ),
      )
      .orderBy(asc(hackathonTeamRequests.createdAt)),
    db
      .select({ expiresAt: hackathonTeamInvites.expiresAt })
      .from(hackathonTeamInvites)
      .where(
        and(
          eq(hackathonTeamInvites.teamId, teamId),
          isNull(hackathonTeamInvites.revokedAt),
          gt(
            hackathonTeamInvites.expiresAt,
            sql`${Math.floor(now.getTime() / 1000)}`,
          ),
        ),
      )
      .orderBy(desc(hackathonTeamInvites.expiresAt))
      .limit(1),
  ]);
  const [team] = teams;
  if (!team) return null;
  return {
    ...team,
    members,
    requests,
    inviteExpiresAt: invites[0]?.expiresAt ?? null,
  };
};

/** The member's requests to join a team in the hackathon still waiting for an answer (B-TEAM-07). */
export const listOwnTeamRequests = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<TeamPageOwnRequest[]> =>
  db
    .select({
      id: hackathonTeamRequests.id,
      teamId: hackathonTeamRequests.teamId,
      teamName: hackathonTeams.name,
      createdAt: hackathonTeamRequests.createdAt,
    })
    .from(hackathonTeamRequests)
    .innerJoin(
      hackathonTeams,
      eq(hackathonTeams.id, hackathonTeamRequests.teamId),
    )
    .where(
      and(
        eq(hackathonTeamRequests.eventId, input.eventId),
        eq(hackathonTeamRequests.userId, input.userId),
        eq(hackathonTeamRequests.status, 'pending'),
      ),
    )
    .orderBy(asc(hackathonTeamRequests.createdAt));
