import { z } from 'zod';

import {
  AppError,
  err,
  HACKATHON_RECUSAL_REASON_MAX,
  idSchema,
  ok,
  type HackathonJudgeStatus,
  type HackathonSubmissionStatus,
  type Result,
} from '@founders-coffee/core';

import { judgingStageAt, type JudgingWindow } from './judge-progress.js';

export const judgeEntriesSchema = z.strictObject({
  eventId: idSchema,
});

export const recusalSchema = z.strictObject({
  eventId: idSchema,
  submissionId: idSchema,
  reason: z.string().trim().min(1).max(HACKATHON_RECUSAL_REASON_MAX),
});

export type RecusalInput = z.infer<typeof recusalSchema>;

type JudgeAccess = JudgingWindow & {
  readonly judge: HackathonJudgeStatus | null;
};

/**
 * Decide whether a member reads a hackathon's entries as a judge (B-JDG-04): only a judge who
 * accepted their place (`not_judge`), and only while judging is open, from the submission deadline
 * until judging ends and before the results are out (`judging_not_started`, `judging_closed`).
 */
export const decideJudgeAccess = (input: JudgeAccess): Result<true> => {
  if (input.judge !== 'accepted')
    return err(
      new AppError('not_judge', 'Only an accepted judge reads entries'),
    );
  const stage = judgingStageAt(input);
  if (stage === 'closed')
    return err(new AppError('judging_closed', 'Judging is closed'));
  if (stage === 'not_started')
    return err(
      new AppError('judging_not_started', 'Judging opens at the deadline'),
    );
  return ok(true);
};

/**
 * Decide whether a judge may recuse themselves from an entry (B-JDG-04): while they may judge, from
 * an entry that was submitted and is not disqualified (`submission_not_found`), and only once,
 * since a recusal cannot be undone (`already_recused`).
 */
export const decideRecusal = (
  input: JudgeAccess & {
    readonly entry: HackathonSubmissionStatus | null;
    readonly isRecused: boolean;
  },
): Result<true> => {
  const access = decideJudgeAccess(input);
  if (!access.ok) return access;
  if (input.entry !== 'submitted')
    return err(
      new AppError('submission_not_found', 'No submitted entry to recuse from'),
    );
  if (input.isRecused)
    return err(
      new AppError('already_recused', 'The judge already recused from it'),
    );
  return ok(true);
};
