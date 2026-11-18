import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  hasRecused,
  listCriterionScales,
  readEntryStatus,
  readJudgePlace,
  saveJudgeScores,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { loadPlaceHackathon } from './place-context.js';

/**
 * Save a judge's scores for one entry (B-JDG-05), replacing what they saved before. The rule
 * decides first; the batch decides again as it writes, and when it lands nothing the rule is asked
 * again so the refusal says why.
 */
export const saveJudgeScoresResolver = async (
  db: Db,
  input: hackathons.JudgeScoresInput & { readonly userId: string },
  now: number = Date.now(),
): Promise<Result<{ readonly saved: number }>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async () => {
    const place = await readJudgePlace(db, input);
    const [entry, isRecused, criteria] = await Promise.all([
      readEntryStatus(db, input),
      place
        ? hasRecused(db, {
            judgeId: place.judgeId,
            submissionId: input.submissionId,
          })
        : false,
      listCriterionScales(db, input.eventId),
    ]);
    const decided = hackathons.decideScoreSave({
      timeline: loaded.data.timeline,
      now,
      isCancelled: loaded.data.isCancelled,
      isResultsPublished: loaded.data.isResultsPublished,
      judge: place?.status ?? null,
      entry,
      isRecused,
      criteria,
      scores: input.scores,
    });
    if (!decided.ok) return decided;
    return place
      ? ok(place.judgeId)
      : err(new AppError('not_judge', 'Only an accepted judge scores'));
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const saved = await saveJudgeScores(db, {
    eventId: input.eventId,
    judgeId: decided.data,
    submissionId: input.submissionId,
    scores: input.scores,
  });
  if (saved === 0) {
    const again = await decide();
    return again.ok
      ? err(new AppError('judging_closed', 'Judging closed meanwhile'))
      : again;
  }
  logger.info('hackathon.scores_saved', {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
    count: saved,
  });
  return ok({ saved });
};
