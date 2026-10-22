import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  type AuditAction,
  type EventStatus,
  type HackathonReviewStatus,
  type Result,
} from '@founders-coffee/core';

import {
  HACKATHON_CRITERIA_MAX,
  HACKATHON_CRITERIA_MIN,
  HACKATHON_WEIGHT_TOTAL,
} from './criteria.js';

export const HACKATHON_READINESS_GAPS = [
  'details',
  'tracks',
  'rubric',
] as const;
export type HackathonReadinessGap = (typeof HACKATHON_READINESS_GAPS)[number];

export const HACKATHON_REVIEW_NOTE_MAX_LENGTH = 1000;
export const HACKATHON_REJECTION_NOTE_MIN_LENGTH = 10;

export const hackathonSubmitSchema = z.strictObject({
  eventId: idSchema,
  version: z.number().int().min(1),
});

const note = z.string().trim().max(HACKATHON_REVIEW_NOTE_MAX_LENGTH);

export const hackathonReviewDecisionSchema = z.discriminatedUnion('decision', [
  z.strictObject({
    eventId: idSchema,
    decision: z.literal('reject'),
    note: note.min(HACKATHON_REJECTION_NOTE_MIN_LENGTH),
  }),
  z.strictObject({
    eventId: idSchema,
    decision: z.literal('approve'),
    note: note.optional().transform((value) => value || undefined),
  }),
]);

export type HackathonReviewDecisionInput = z.infer<
  typeof hackathonReviewDecisionSchema
>;
export type HackathonReviewDecision = HackathonReviewDecisionInput['decision'];

/**
 * What a hackathon still lacks before its organisers can send it for review (B-HKN-08): its details
 * (dates, who can take part, the rules), at least one track, and a rubric of three or four criteria
 * whose weights add up to 100. Prizes are optional. An empty list means it is ready.
 */
export const hackathonReadinessGaps = (input: {
  readonly hasDetails: boolean;
  readonly trackCount: number;
  readonly criterionWeights: readonly number[];
}): readonly HackathonReadinessGap[] => {
  const weights = input.criterionWeights;
  const isRubricComplete =
    weights.length >= HACKATHON_CRITERIA_MIN &&
    weights.length <= HACKATHON_CRITERIA_MAX &&
    weights.reduce((sum, weight) => sum + weight, 0) === HACKATHON_WEIGHT_TOTAL;
  return [
    ...(input.hasDetails ? [] : (['details'] as const)),
    ...(input.trackCount > 0 ? [] : (['tracks'] as const)),
    ...(isRubricComplete ? [] : (['rubric'] as const)),
  ];
};

/**
 * Decide whether organisers can send a hackathon for review (B-HKN-08), or refuse with a typed error.
 *
 * Only an unpublished hackathon goes, once, while no review is pending: a draft, or one the reviewers
 * sent back, which goes again after the organisers change it. It has to be complete first.
 */
export const decideSubmission = (input: {
  readonly eventStatus: EventStatus;
  readonly reviewStatus: HackathonReviewStatus;
  readonly gaps: readonly HackathonReadinessGap[];
}): Result<true> => {
  if (
    input.eventStatus !== 'draft' ||
    (input.reviewStatus !== 'draft' && input.reviewStatus !== 'rejected')
  )
    return err(
      new AppError(
        'hackathon_not_submittable',
        'This hackathon is not a draft waiting to be sent for review',
      ),
    );
  if (input.gaps.length > 0)
    return err(
      new AppError('hackathon_incomplete', 'The hackathon is not complete', {
        gaps: input.gaps,
      }),
    );
  return ok(true);
};

type ReviewRule = {
  readonly from: HackathonReviewStatus;
  readonly to: HackathonReviewStatus;
  readonly action: AuditAction;
};

const RULES: Record<HackathonReviewDecision, ReviewRule> = {
  approve: { from: 'submitted', to: 'approved', action: 'approved' },
  reject: { from: 'submitted', to: 'rejected', action: 'rejected' },
};

/**
 * What an operator's decision does to a hackathon in `current` review status (B-HKN-08), or a typed
 * refusal: approving or rejecting decides only a hackathon its organisers sent for review.
 */
export const decideHackathonReview = (
  current: HackathonReviewStatus,
  decision: HackathonReviewDecision,
): Result<ReviewRule> => {
  const rule = RULES[decision];
  return rule.from === current
    ? ok(rule)
    : err(
        new AppError(
          'invalid_hackathon_transition',
          `Cannot ${decision} a hackathon that is '${current}'`,
        ),
      );
};
