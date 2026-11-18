import { z } from 'zod';

import {
  AppError,
  err,
  HACKATHON_SCORE_COMMENT_MAX,
  idSchema,
  ok,
  type HackathonSubmissionStatus,
  type Result,
} from '@founders-coffee/core';

import { decideJudgeAccess } from './judge-entries.js';

const SCORE_CEILING = 10;
const CRITERIA_CEILING = 20;

export const judgeScoresSchema = z
  .strictObject({
    eventId: idSchema,
    submissionId: idSchema,
    scores: z
      .array(
        z.strictObject({
          criterionId: idSchema,
          value: z.number().int().min(1).max(SCORE_CEILING),
          comment: z
            .string()
            .trim()
            .max(HACKATHON_SCORE_COMMENT_MAX)
            .transform((comment) => (comment === '' ? null : comment))
            .nullable()
            .default(null),
        }),
      )
      .min(1)
      .max(CRITERIA_CEILING),
  })
  .refine(
    (input) =>
      new Set(input.scores.map((score) => score.criterionId)).size ===
      input.scores.length,
    { message: 'Each criterion is scored once', path: ['scores'] },
  );

export type JudgeScoresInput = z.infer<typeof judgeScoresSchema>;
export type JudgeScoreValue = JudgeScoresInput['scores'][number];

/**
 * Decide whether a judge may save scores for an entry (B-JDG-05): while they may judge, which ends
 * when the results are published, for an entry that is submitted (`submission_not_found`) and that
 * they did not recuse from (`judge_recused`), each score for one of the hackathon's criteria
 * (`criterion_not_found`) and within its scale (`score_out_of_range`). A judge may save again to
 * change a score until then.
 */
export const decideScoreSave = (
  input: Parameters<typeof decideJudgeAccess>[0] & {
    readonly entry: HackathonSubmissionStatus | null;
    readonly isRecused: boolean;
    readonly criteria: readonly {
      readonly id: string;
      readonly scale: number;
    }[];
    readonly scores: readonly JudgeScoreValue[];
  },
): Result<true> => {
  const access = decideJudgeAccess(input);
  if (!access.ok) return access;
  if (input.entry !== 'submitted')
    return err(new AppError('submission_not_found', 'No submitted entry'));
  if (input.isRecused)
    return err(
      new AppError('judge_recused', 'The judge recused from this entry'),
    );
  const scaleOf = new Map(
    input.criteria.map((criterion) => [criterion.id, criterion.scale]),
  );
  for (const score of input.scores) {
    const scale = scaleOf.get(score.criterionId);
    if (scale === undefined)
      return err(
        new AppError(
          'criterion_not_found',
          'Not one of the hackathon’s criteria',
        ),
      );
    if (score.value > scale)
      return err(
        new AppError('score_out_of_range', 'The score is above the scale'),
      );
  }
  return ok(true);
};
