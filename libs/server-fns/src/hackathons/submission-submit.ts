import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  listHackathonTracks,
  readParticipantStanding,
  readTeamSubmissionEntry,
  submitTeamSubmission,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, type Metrics } from '@founders-coffee/observability';

import { recordHackathonMetric } from './metrics.js';
import { loadTeamHackathon } from './team-context.js';

export type SubmissionSubmitted = {
  readonly submissionId: string;
  readonly version: number;
  readonly submittedAt: number;
};

const submissionConflict = () =>
  err(
    new AppError(
      'submission_conflict',
      'The entry changed while you were editing it',
    ),
  );

/**
 * Submit the team's entry (B-SUB-04): its captain, at the version they saw, before the submission
 * deadline by the server's clock. The rules decide first; the write then makes the same decision
 * again in one atomic statement as of the same moment, and keeps a snapshot of what was submitted.
 * When it lands nothing, the rules are asked again so the refusal says why, and otherwise someone
 * saved in between. A team may submit again before the deadline; each submit keeps its own
 * snapshot.
 */
export const submitSubmissionResolver = async (
  db: Db,
  metrics: Metrics | null | undefined,
  input: {
    readonly eventId: string;
    readonly userId: string;
    readonly version: number;
  },
  now: number = Date.now(),
): Promise<Result<SubmissionSubmitted>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const { event, timeline, aiPolicy } = loaded.data;
  const decide = async (): Promise<
    Result<{
      readonly teamId: string;
      readonly submissionId: string;
      readonly trackId: string;
    }>
  > => {
    const [standing, tracks] = await Promise.all([
      readParticipantStanding(db, input),
      listHackathonTracks(db, input.eventId),
    ]);
    const { membership } = standing;
    const entry = membership
      ? await readTeamSubmissionEntry(db, membership.teamId)
      : null;
    const decided = hackathons.decideSubmit({
      timeline,
      now,
      membership,
      version: input.version,
      entry,
      hackathon: { trackIds: tracks.map((track) => track.id), aiPolicy },
    });
    if (!decided.ok) return decided;
    return membership && entry
      ? ok({
          teamId: membership.teamId,
          submissionId: entry.id,
          trackId: decided.data.trackId,
        })
      : submissionConflict();
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const { teamId, submissionId, trackId } = decided.data;
  const version = await submitTeamSubmission(db, {
    eventId: input.eventId,
    teamId,
    captainId: input.userId,
    version: input.version,
    now: new Date(now),
  });
  if (version === null) {
    const again = await decide();
    return again.ok ? submissionConflict() : again;
  }
  logger.info('hackathon.submission_submitted', {
    eventId: input.eventId,
    marketCode: event.marketCode,
    version,
  });
  recordHackathonMetric(metrics, 'submission_submitted', {
    marketCode: event.marketCode,
    hackathonId: input.eventId,
    trackId,
  });
  return ok({
    submissionId,
    version,
    submittedAt: Math.floor(now / 1000) * 1000,
  });
};
