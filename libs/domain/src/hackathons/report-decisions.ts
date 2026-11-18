import { z } from 'zod';

import {
  AppError,
  err,
  HACKATHON_REPORT_DECISION_REASON_MAX,
  HACKATHON_REPORT_DECISION_REASON_MIN,
  HACKATHON_REPORT_EVIDENCE_MAX,
  hackathonReportTargetSchema,
  idSchema,
  ok,
  type Result,
} from '@founders-coffee/core';

export const HACKATHON_REPORT_DECISIONS = ['dismiss', 'disqualify'] as const;
export type HackathonReportDecision =
  (typeof HACKATHON_REPORT_DECISIONS)[number];

export const reportQueueSchema = z.strictObject({
  page: z.number().int().min(0).max(1000).default(0),
});

const target = {
  targetType: hackathonReportTargetSchema,
  targetId: idSchema,
};

export const reportDecisionSchema = z.discriminatedUnion('decision', [
  z.strictObject({ ...target, decision: z.literal('dismiss') }),
  z.strictObject({
    ...target,
    decision: z.literal('disqualify'),
    reason: z
      .string()
      .trim()
      .min(HACKATHON_REPORT_DECISION_REASON_MIN)
      .max(HACKATHON_REPORT_DECISION_REASON_MAX),
    evidence: z.string().trim().min(1).max(HACKATHON_REPORT_EVIDENCE_MAX),
  }),
]);

export type ReportDecisionInput = z.infer<typeof reportDecisionSchema>;

/**
 * Decide whether an administrator may decide on a reported entry or team (B-SAFE-02): only while it
 * has reports still open, so a target another administrator decided first is not decided twice
 * (`report_decided`). Reports about a team that has since disbanded can still be dismissed, but
 * there is no team left to disqualify (`report_not_found`).
 */
export const decideReportReview = (target: {
  readonly decision: HackathonReportDecision;
  readonly teamId: string | null;
  readonly openReports: number;
}): Result<{ readonly teamId: string | null }> => {
  if (target.openReports === 0)
    return err(
      new AppError('report_decided', 'These reports were decided already'),
    );
  if (target.decision === 'disqualify' && !target.teamId)
    return err(new AppError('report_not_found', 'The reported team is gone'));
  return ok({ teamId: target.teamId });
};
