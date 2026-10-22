import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  createSubmissionDraft,
  listHackathonTracks,
  readParticipantStanding,
  readTeamSubmission,
  updateSubmissionDraft,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { loadTeamHackathon } from './team-context.js';

export type SubmissionDraftSaved = {
  readonly submissionId: string;
  readonly version: number;
};

const submissionConflict = () =>
  err(
    new AppError(
      'submission_conflict',
      'The entry changed while you were editing it',
    ),
  );

/**
 * Save the team's submission draft (B-SUB-03): its captain, while the team is building, at the
 * version they saw, 0 for the team's first save. The track has to be the hackathon's own; an entry
 * already submitted stays complete, and a disqualified one stays as it was. The write re-checks the
 * captain, the phase and the version; when it lands nothing, the rules are asked again so the
 * refusal says why, and otherwise someone saved in between.
 */
export const saveSubmissionDraftResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly userId: string;
    readonly version: number;
    readonly draft: hackathons.SubmissionDraft;
  },
  now: number = Date.now(),
): Promise<Result<SubmissionDraftSaved>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async (): Promise<Result<{ readonly teamId: string }>> => {
    const standing = await readParticipantStanding(db, input);
    const decided = hackathons.decideDraftSave({
      timeline: loaded.data.timeline,
      now,
      membership: standing.membership,
    });
    if (!decided.ok) return decided;
    return standing.membership
      ? ok({ teamId: standing.membership.teamId })
      : submissionConflict();
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const { teamId } = decided.data;
  const { trackId } = input.draft;
  if (
    trackId !== null &&
    !(await listHackathonTracks(db, input.eventId)).some(
      (track) => track.id === trackId,
    )
  )
    return err(
      new AppError('track_not_in_hackathon', 'No such track in this hackathon'),
    );
  const existing = await readTeamSubmission(db, teamId);
  if ((existing?.version ?? 0) !== input.version) return submissionConflict();
  if (existing) {
    const replaceable = hackathons.decideDraftReplace(
      existing.status,
      input.draft,
    );
    if (!replaceable.ok) return replaceable;
  }
  const captain = { eventId: input.eventId, teamId, captainId: input.userId };
  const submissionId = existing?.id ?? id('sub');
  const version = existing
    ? await updateSubmissionDraft(db, {
        ...captain,
        version: input.version,
        draft: input.draft,
      })
    : (await createSubmissionDraft(db, {
          ...captain,
          id: submissionId,
          draft: input.draft,
        }))
      ? 1
      : null;
  if (version === null) {
    const again = await decide();
    return again.ok ? submissionConflict() : again;
  }
  logger.info('hackathon.submission_draft_saved', {
    eventId: input.eventId,
    marketCode: loaded.data.event.marketCode,
    version,
  });
  return ok({ submissionId, version });
};
