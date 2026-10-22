import {
  ok,
  type HackathonRegistrationStatus,
  type Result,
} from '@founders-coffee/core';
import {
  listOwnTeamRequests,
  readParticipantStanding,
  readTeamPageTeam,
  type Db,
  type TeamPageMember,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { loadTeamHackathon } from './team-context.js';

export type TeamPageView = {
  readonly event: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly marketCode: string;
  };
  readonly submissionDeadlineAt: number;
  readonly canChangeTeams: boolean;
  readonly teamMin: number;
  readonly teamMax: number;
  readonly viewerId: string;
  readonly registration: HackathonRegistrationStatus | null;
  readonly team: {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
    readonly isLookingForMembers: boolean;
    readonly isCaptain: boolean;
    readonly members: readonly TeamPageMember[];
    readonly requests: readonly {
      readonly id: string;
      readonly userId: string;
      readonly name: string | null;
      readonly createdAt: number;
    }[];
    readonly inviteExpiresAt: number | null;
  } | null;
  readonly ownRequests: readonly {
    readonly id: string;
    readonly teamId: string;
    readonly teamName: string;
    readonly createdAt: number;
  }[];
};

/**
 * A member's team page for a published hackathon (B-TEAM-07): where they stand in it, the team
 * they are in with its members, and whether teams can still change, decided here from the
 * hackathon's dates. Only the captain is given the requests waiting for an answer and when the
 * team's invite link stops working; a member in no team is given their own requests instead.
 */
export const teamPageResolver = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<Result<TeamPageView>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const { event, timeline, teamMin, teamMax } = loaded.data;
  const standing = await readParticipantStanding(db, input);
  const membership = standing.membership;
  const [team, ownRequests] = await Promise.all([
    membership ? readTeamPageTeam(db, membership.teamId, new Date(now)) : null,
    membership ? [] : listOwnTeamRequests(db, input),
  ]);
  const isCaptain = membership?.isCaptain ?? false;
  return ok({
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      marketCode: event.marketCode,
    },
    submissionDeadlineAt: timeline.submissionDeadlineAt,
    canChangeTeams: hackathons.canChangeTeams(timeline, now),
    teamMin,
    teamMax,
    viewerId: input.userId,
    registration: standing.status,
    team: team && {
      id: team.id,
      name: team.name,
      description: team.description,
      isLookingForMembers: team.isLookingForMembers,
      isCaptain,
      members: team.members,
      requests: isCaptain
        ? team.requests.map((request) => ({
            ...request,
            createdAt: request.createdAt.getTime(),
          }))
        : [],
      inviteExpiresAt: isCaptain
        ? (team.inviteExpiresAt?.getTime() ?? null)
        : null,
    },
    ownRequests: ownRequests.map((request) => ({
      ...request,
      createdAt: request.createdAt.getTime(),
    })),
  });
};
