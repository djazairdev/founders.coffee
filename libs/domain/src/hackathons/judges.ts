import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  type HackathonJudgeStatus,
  type Result,
} from '@founders-coffee/core';

import { phaseAt, type HackathonTimeline } from './timeline.js';

export const HACKATHON_JUDGE_LIMIT = 30;

export const hackathonJudgeInviteSchema = z.strictObject({ eventId: idSchema });

export const hackathonJudgeRemoveSchema = z.strictObject({
  eventId: idSchema,
  judgeId: idSchema,
});

export const hackathonJudgeAnswerSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  answer: z.enum(['accept', 'decline']),
});

export type HackathonJudgeAnswerInput = z.infer<
  typeof hackathonJudgeAnswerSchema
>;

const judgingClosed = () =>
  err(new AppError('judging_closed', 'Judging for this hackathon has ended'));

/**
 * Whether the hackathon's judges can still change (B-JDG-03): it is not cancelled and judging has
 * not ended. Once results are due, the judges who scored are the ones they come from.
 */
const canChangeJudges = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly isCancelled: boolean;
}): Result<true> => {
  if (input.isCancelled)
    return err(
      new AppError('hackathon_not_editable', 'The hackathon was cancelled'),
    );
  if (phaseAt(input.timeline, input.now) === 'results') return judgingClosed();
  return ok(true);
};

/**
 * Decide whether organisers can add or remove a judge's place (B-JDG-03): while the judges can
 * still change, and, to add one, while the hackathon has fewer than
 * {@link HACKATHON_JUDGE_LIMIT} places invited or accepted.
 */
export const decideJudgeChange = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly isCancelled: boolean;
  readonly openPlaces?: number;
}): Result<true> => {
  const changeable = canChangeJudges(input);
  if (!changeable.ok) return changeable;
  if (
    input.openPlaces !== undefined &&
    input.openPlaces >= HACKATHON_JUDGE_LIMIT
  )
    return err(
      new AppError('judge_limit_reached', 'This hackathon has enough judges'),
    );
  return ok(true);
};

/**
 * Decide whether a member can answer a judge's invite link (B-JDG-03): the link is still waiting
 * for an answer, the judges can still change, and, to accept, the member holds no other place in
 * the hackathon. A link that was answered or removed no longer works, except that the member who
 * accepted it gets their acceptance back.
 */
export const decideJudgeAnswer = (input: {
  readonly invite: {
    readonly status: HackathonJudgeStatus;
    readonly userId: string | null;
  };
  readonly answer: 'accept' | 'decline';
  readonly userId: string;
  readonly heldPlace: HackathonJudgeStatus | null;
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly isCancelled: boolean;
}): Result<{ readonly isAlreadyAnswered: boolean }> => {
  const { invite } = input;
  if (
    invite.status === 'accepted' &&
    invite.userId === input.userId &&
    input.answer === 'accept'
  )
    return ok({ isAlreadyAnswered: true });
  if (invite.status !== 'invited')
    return err(
      new AppError('judge_invite_invalid', 'This invite link no longer works'),
    );
  const changeable = canChangeJudges(input);
  if (!changeable.ok) return changeable;
  if (input.answer === 'accept' && input.heldPlace !== null)
    return err(
      input.heldPlace === 'removed'
        ? new AppError(
            'judge_removed',
            'The organisers removed you from this hackathon’s judges',
          )
        : new AppError('already_judge', 'You already judge this hackathon'),
    );
  return ok({ isAlreadyAnswered: false });
};
