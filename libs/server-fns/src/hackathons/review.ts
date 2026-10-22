import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  listHackathonCriteria,
  listHackathonTracks,
  submitHackathonForReview,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger, reportError } from '@founders-coffee/observability';

import { hackathonConflict, loadHackathonEdit } from './edit-context.js';

/**
 * Send a hackathon to the reviewers (B-HKN-08). It has to be an unpublished draft, or one they sent
 * back, with nothing waiting for them already (`hackathon_not_submittable`), and complete: its
 * details, a track, and a rubric that adds up (`hackathon_incomplete`, naming what is missing). The
 * write checks all of it again on the version the organiser saw, and moves the version on, so the
 * hackathon cannot change while it is with the reviewers.
 */
export const submitHackathonForReviewResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly organisationId: string;
  },
  now: number = Date.now(),
): Promise<Result<{ readonly eventId: string; readonly version: number }>> => {
  const loaded = await loadHackathonEdit(db, input, now);
  if (!loaded.ok) return loaded;
  const [tracks, criteria] = await Promise.all([
    listHackathonTracks(db, input.eventId),
    listHackathonCriteria(db, input.eventId),
  ]);
  const { event, details } = loaded.data.rows;
  const decided = hackathons.decideSubmission({
    eventStatus: event.status,
    reviewStatus: details?.reviewStatus ?? 'draft',
    gaps: hackathons.hackathonReadinessGaps({
      hasDetails: details !== null,
      trackCount: tracks.length,
      criterionWeights: criteria.map((criterion) => criterion.weight),
    }),
  });
  if (!decided.ok) return decided;
  const context = { eventId: event.id, market: event.marketCode };
  let version: number | null;
  try {
    version = await submitHackathonForReview(db, input);
  } catch (error) {
    reportError(error, {
      operation: 'hackathon_submitted_for_review',
      ...context,
    });
    return err(
      new AppError('hackathon_save_failed', 'The change could not be saved'),
    );
  }
  if (version === null) return hackathonConflict();
  logger.info('hackathon_submitted_for_review', {
    ...context,
    organisationId: input.organisationId,
    version,
  });
  return ok({ eventId: event.id, version });
};
