import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  createHackathonTeam,
  readParticipantStanding,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, type Metrics } from '@founders-coffee/observability';

import { recordHackathonMetric } from './metrics.js';
import { loadTeamHackathon } from './team-context.js';

export type TeamCreateInput = {
  readonly eventId: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isLookingForMembers: boolean;
};

export type TeamCreated = { readonly teamId: string };

/**
 * Start a team in a hackathon, with the signed-in member as its captain (B-TEAM-03).
 *
 * The team rules decide first, from where the member stands: teams can still change, they hold a
 * place, and they are in no team yet (`teams_locked`, `not_registered`, `already_in_team`). The
 * write re-checks all of it in one atomic batch, which also refuses a name another team of the
 * hackathon already has, whatever its case (`team_name_taken`). When something else changed in
 * between, the rules are asked again so the refusal says why.
 */
export const createHackathonTeamResolver = async (
  db: Db,
  metrics: Metrics | null,
  input: TeamCreateInput,
  now: number = Date.now(),
): Promise<Result<TeamCreated>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const { event, timeline } = loaded.data;
  const decide = async () => {
    const standing = await readParticipantStanding(db, input);
    return hackathons.decideCreateTeam({
      timeline,
      now,
      registration: standing.status,
      membership: standing.membership,
    });
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const teamId = id('team');
  const written = await createHackathonTeam(db, { ...input, id: teamId });
  if (written.outcome === 'name_taken')
    return err(
      new AppError('team_name_taken', 'Another team already has this name'),
    );
  if (written.outcome === 'not_created') {
    const again = await decide();
    return again.ok
      ? err(new AppError('teams_locked', 'Teams no longer change'))
      : again;
  }
  recordHackathonMetric(metrics, 'team_created', {
    marketCode: event.marketCode,
    hackathonId: event.id,
  });
  logger.info('hackathon.team_created', {
    eventId: event.id,
    marketCode: event.marketCode,
  });
  return ok({ teamId });
};
