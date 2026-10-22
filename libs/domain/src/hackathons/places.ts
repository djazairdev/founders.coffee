import {
  AppError,
  err,
  ok,
  type HackathonErrorCode,
  type HackathonJudgeStatus,
  type Result,
} from '@founders-coffee/core';

import { phaseAt, type HackathonTimeline } from './timeline.js';

export type PlaceRole = 'judge' | 'mentor';

export const HACKATHON_PLACE_LIMIT = 30;

const CODES: Record<
  PlaceRole,
  {
    readonly limit: HackathonErrorCode;
    readonly invalid: HackathonErrorCode;
    readonly removed: HackathonErrorCode;
    readonly held: HackathonErrorCode;
    readonly missing: HackathonErrorCode;
  }
> = {
  judge: {
    limit: 'judge_limit_reached',
    invalid: 'judge_invite_invalid',
    removed: 'judge_removed',
    held: 'already_judge',
    missing: 'judge_not_found',
  },
  mentor: {
    limit: 'mentor_limit_reached',
    invalid: 'mentor_invite_invalid',
    removed: 'mentor_removed',
    held: 'already_mentor',
    missing: 'mentor_not_found',
  },
};

const MESSAGES = {
  limit: 'This hackathon has enough people in this role',
  invalid: 'This invite link no longer works',
  missing: 'No such place to remove',
} as const;

/**
 * The refusal for a role's place when the hackathon has enough of them (`limit`), when an invite
 * link no longer works or was never made (`invalid`), or when there is no such place to remove
 * (`missing`).
 */
export const placeRefusal = (
  role: PlaceRole,
  kind: keyof typeof MESSAGES,
): AppError => new AppError(CODES[role][kind], MESSAGES[kind]);

const otherRole = (role: PlaceRole): PlaceRole =>
  role === 'judge' ? 'mentor' : 'judge';

type Moment = {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly isCancelled: boolean;
};

/**
 * Whether a hackathon's judges and mentors can still change (B-JDG-03, B-HKN-25): it is not
 * cancelled and judging has not ended. Once results are due, the people behind them are settled.
 */
export const canChangePlaces = (input: Moment): Result<true> => {
  if (input.isCancelled)
    return err(
      new AppError('hackathon_not_editable', 'The hackathon was cancelled'),
    );
  if (phaseAt(input.timeline, input.now) === 'results')
    return err(
      new AppError('judging_closed', 'Judging for this hackathon has ended'),
    );
  return ok(true);
};

/**
 * Decide whether organisers can add or remove a judge's or a mentor's place: while places can
 * still change, and, to add one, while the hackathon has fewer than
 * {@link HACKATHON_PLACE_LIMIT} of that role invited or accepted.
 */
export const decidePlaceChange = (
  role: PlaceRole,
  input: Moment & { readonly openPlaces?: number },
): Result<true> => {
  const changeable = canChangePlaces(input);
  if (!changeable.ok) return changeable;
  if (
    input.openPlaces !== undefined &&
    input.openPlaces >= HACKATHON_PLACE_LIMIT
  )
    return err(placeRefusal(role, 'limit'));
  return ok(true);
};

/**
 * Decide whether a member can answer an invite link for a judge's or a mentor's place: the link is
 * still waiting for an answer and places can still change. To accept, the member holds no other
 * place of that role in the hackathon, and does not hold the other role there either: a mentor
 * is never a judge of the same hackathon. A link answered or removed no longer works, except that
 * the member who accepted it gets their acceptance back.
 */
export const decidePlaceAnswer = (
  role: PlaceRole,
  input: Moment & {
    readonly invite: {
      readonly status: HackathonJudgeStatus;
      readonly userId: string | null;
    };
    readonly answer: 'accept' | 'decline';
    readonly userId: string;
    readonly heldPlace: HackathonJudgeStatus | null;
    readonly holdsOtherRole: boolean;
  },
): Result<{ readonly isAlreadyAnswered: boolean }> => {
  const { invite } = input;
  if (
    invite.status === 'accepted' &&
    invite.userId === input.userId &&
    input.answer === 'accept'
  )
    return ok({ isAlreadyAnswered: true });
  if (invite.status !== 'invited') return err(placeRefusal(role, 'invalid'));
  const changeable = canChangePlaces(input);
  if (!changeable.ok) return changeable;
  if (input.answer === 'decline') return ok({ isAlreadyAnswered: false });
  if (input.heldPlace === 'removed')
    return err(
      new AppError(CODES[role].removed, `The organisers removed this ${role}`),
    );
  if (input.heldPlace !== null)
    return err(new AppError(CODES[role].held, `Already a ${role} here`));
  if (input.holdsOtherRole)
    return err(
      new AppError(
        CODES[otherRole(role)].held,
        `Already a ${otherRole(role)} here`,
      ),
    );
  return ok({ isAlreadyAnswered: false });
};
