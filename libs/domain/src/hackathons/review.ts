import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  type AuditAction,
  type HackathonReviewStatus,
  type Result,
} from '@founders-coffee/core';

export const HACKATHON_REVIEW_NOTE_MAX_LENGTH = 1000;
export const HACKATHON_REJECTION_NOTE_MIN_LENGTH = 10;

const note = z.string().trim().max(HACKATHON_REVIEW_NOTE_MAX_LENGTH);

export const hackathonReviewDecisionSchema = z.discriminatedUnion('decision', [
  z.strictObject({
    eventId: idSchema,
    version: z.number().int().min(1),
    decision: z.literal('reject'),
    note: note.min(HACKATHON_REJECTION_NOTE_MIN_LENGTH),
  }),
  z.strictObject({
    eventId: idSchema,
    version: z.number().int().min(1),
    decision: z.literal('approve'),
    note: note.optional().transform((value) => value || undefined),
  }),
]);

export type HackathonReviewDecisionInput = z.infer<
  typeof hackathonReviewDecisionSchema
>;
export type HackathonReviewDecision = HackathonReviewDecisionInput['decision'];

type ReviewRule = {
  readonly from: HackathonReviewStatus;
  readonly to: HackathonReviewStatus;
  readonly action: AuditAction;
};

const RULES: Record<HackathonReviewDecision, Omit<ReviewRule, 'from'>> = {
  approve: { to: 'approved', action: 'approved' },
  reject: { to: 'rejected', action: 'rejected' },
};

/** Decide an admin review action for a saved draft or a legacy submitted hackathon. */
export const decideHackathonReview = (
  current: HackathonReviewStatus,
  decision: HackathonReviewDecision,
): Result<ReviewRule> => {
  if (current !== 'draft' && current !== 'submitted')
    return err(
      new AppError(
        'invalid_hackathon_transition',
        `Cannot ${decision} a hackathon that is '${current}'`,
      ),
    );
  return ok({ from: current, ...RULES[decision] });
};
