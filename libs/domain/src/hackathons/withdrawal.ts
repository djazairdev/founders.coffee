import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  type HackathonRegistrationStatus,
  type Result,
} from '@founders-coffee/core';

import type { TeamMembership } from './teams.js';
import type { HackathonTimeline } from './timeline.js';

export const hackathonWithdrawalSchema = z.strictObject({ eventId: idSchema });

export type HackathonWithdrawalInput = z.input<
  typeof hackathonWithdrawalSchema
>;

/**
 * Decide whether a member may withdraw from a hackathon (B-REG-04), or refuse with a typed error.
 *
 * Only someone who holds a place or waits for one withdraws. They can until the submission
 * deadline, when teams stop changing too, since withdrawing takes them out of their team. A captain
 * whose team has anyone else in it hands the captaincy on first, as when leaving a team; a captain
 * alone in their team takes it with them.
 */
export const decideWithdrawal = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly status: HackathonRegistrationStatus | null;
  readonly membership: TeamMembership | null;
  readonly teamSize: number;
}): Result<true> => {
  if (input.status !== 'registered' && input.status !== 'waitlisted')
    return err(
      new AppError('not_registered', 'Only a registered member withdraws'),
    );
  if (input.now >= input.timeline.submissionDeadlineAt)
    return err(
      new AppError(
        'withdrawal_closed',
        'Withdrawing closes with the submission deadline',
      ),
    );
  if (input.membership?.isCaptain && input.teamSize > 1)
    return err(
      new AppError(
        'captain_must_transfer',
        'The captain hands the team on before withdrawing',
      ),
    );
  return ok(true);
};
