import { and, eq, isNotNull } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  hackathonSubmissions,
  hackathonTeamMembers,
  hackathonTeams,
  user,
} from './schema.js';

export type TeamNoticeParties = {
  readonly teamName: string;
  readonly members: readonly {
    readonly userId: string;
    readonly isCaptain: boolean;
  }[];
  readonly name: string | null;
};

/**
 * Who a team notice is about and who it goes to (B-TEAM-09), in one trip to D1: the team's name,
 * its members as they stand now, and the name of the member the notice is about. A team that no
 * longer exists has nobody to tell.
 */
export const readTeamNoticeParties = async (
  db: Db,
  input: { readonly teamId: string; readonly userId: string },
): Promise<TeamNoticeParties | null> => {
  const [teams, members, people] = await db.batch([
    db
      .select({ name: hackathonTeams.name })
      .from(hackathonTeams)
      .where(eq(hackathonTeams.id, input.teamId)),
    db
      .select({
        userId: hackathonTeamMembers.userId,
        isCaptain: hackathonTeamMembers.isCaptain,
      })
      .from(hackathonTeamMembers)
      .where(eq(hackathonTeamMembers.teamId, input.teamId)),
    db.select({ name: user.name }).from(user).where(eq(user.id, input.userId)),
  ]);
  const [team] = teams;
  if (!team) return null;
  return { teamName: team.name, members, name: people[0]?.name ?? null };
};

export type DeadlineReminderStanding = {
  readonly teamName: string | null;
  readonly hasSubmitted: boolean;
};

/**
 * What a member's submission-deadline reminders say (B-SUB-07): the name of the team they are in,
 * if any, and whether it has submitted anything, in which case it needs no reminder.
 */
export const readDeadlineReminderStanding = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<DeadlineReminderStanding> => {
  const [row] = await db
    .select({
      teamName: hackathonTeams.name,
      submissionId: hackathonSubmissions.id,
    })
    .from(hackathonTeamMembers)
    .innerJoin(
      hackathonTeams,
      eq(hackathonTeams.id, hackathonTeamMembers.teamId),
    )
    .leftJoin(
      hackathonSubmissions,
      and(
        eq(hackathonSubmissions.teamId, hackathonTeamMembers.teamId),
        isNotNull(hackathonSubmissions.submittedAt),
      ),
    )
    .where(
      and(
        eq(hackathonTeamMembers.eventId, input.eventId),
        eq(hackathonTeamMembers.userId, input.userId),
      ),
    );
  return {
    teamName: row?.teamName ?? null,
    hasSubmitted: (row?.submissionId ?? null) !== null,
  };
};
