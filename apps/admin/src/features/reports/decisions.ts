import {
  HACKATHON_REPORT_DECISION_REASON_MAX,
  HACKATHON_REPORT_DECISION_REASON_MIN,
  HACKATHON_REPORT_EVIDENCE_MAX,
  type HackathonReportTarget,
} from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

export type ReportDecision = hackathons.HackathonReportDecision;

export const REPORT_DECISIONS = hackathons.HACKATHON_REPORT_DECISIONS;
export const DECISION_REASON_MIN = HACKATHON_REPORT_DECISION_REASON_MIN;
export const DECISION_REASON_MAX = HACKATHON_REPORT_DECISION_REASON_MAX;
export const EVIDENCE_MAX = HACKATHON_REPORT_EVIDENCE_MAX;

export type ReportDecisionDraft = {
  readonly targetType: HackathonReportTarget;
  readonly targetId: string;
  readonly decision: ReportDecision;
  readonly reason: string;
  readonly evidence: string;
};

/**
 * The decision the server will accept, read through the same schema it validates with, or `null`
 * when a disqualification lacks its reason or evidence. A dismissal sends neither.
 */
export const reportDecisionRequest = (
  draft: ReportDecisionDraft,
): hackathons.ReportDecisionInput | null => {
  const { reason, evidence, ...target } = draft;
  const parsed = hackathons.reportDecisionSchema.safeParse(
    draft.decision === 'dismiss' ? target : { ...target, reason, evidence },
  );
  return parsed.success ? parsed.data : null;
};
