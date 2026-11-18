import {
  ok,
  type HackathonRegistrationStatus,
  type Result,
} from '@founders-coffee/core';
import {
  readLookingForTeam,
  readParticipantStanding,
  type Db,
  type LookingParticipant,
  type LookingTeam,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { loadTeamHackathon } from './team-context.js';

const LOOKING_LIST_LIMIT = 100;

export type LookingForTeamView = {
  readonly event: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly marketCode: string;
  };
  readonly canChangeTeams: boolean;
  readonly teamMax: number;
  readonly registration: HackathonRegistrationStatus | null;
  readonly isInTeam: boolean;
  readonly teams: readonly (LookingTeam & { readonly isRequested: boolean })[];
  readonly hasMoreTeams: boolean;
  readonly participants: readonly LookingParticipant[];
  readonly hasMoreParticipants: boolean;
  readonly listLimit: number;
};

/**
 * The looking-for-a-team page of a published hackathon (B-TEAM-08): the teams that want members
 * and the participants who want a team. Only a registered participant is shown them; anyone else
 * is told where they stand and given empty lists, so the page never lists people to someone who
 * is not taking part.
 */
export const lookingForTeamResolver = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<Result<LookingForTeamView>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const { event, timeline, teamMax } = loaded.data;
  const standing = await readParticipantStanding(db, input);
  const looking =
    standing.status === 'registered'
      ? await readLookingForTeam(db, {
          ...input,
          teamMax,
          limit: LOOKING_LIST_LIMIT,
        })
      : null;
  const requested = new Set(looking?.requestedTeamIds);
  return ok({
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      marketCode: event.marketCode,
    },
    canChangeTeams: hackathons.canChangeTeams(timeline, now),
    teamMax,
    registration: standing.status,
    isInTeam: standing.membership !== null,
    teams: (looking?.teams ?? []).map((team) => ({
      ...team,
      isRequested: requested.has(team.id),
    })),
    hasMoreTeams: looking?.hasMoreTeams ?? false,
    participants: looking?.participants ?? [],
    hasMoreParticipants: looking?.hasMoreParticipants ?? false,
    listLimit: LOOKING_LIST_LIMIT,
  });
};
