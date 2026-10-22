import { eq } from 'drizzle-orm';

import type { Db } from './db.js';
import { hackathonTeamMembers, hackathonTeams, user } from './schema.js';

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
