import { useId, useRef, useState } from 'react';

import type { HackathonReportTarget } from '@founders-coffee/core';
import {
  admin_rpt_dismiss,
  admin_rpt_disqualify,
  admin_rpt_evidence_hint,
  admin_rpt_evidence_label,
  admin_rpt_needed,
  admin_rpt_reason_hint,
  admin_rpt_reason_label,
  type Locale,
} from '@founders-coffee/i18n';

import {
  DECISION_REASON_MAX,
  DECISION_REASON_MIN,
  EVIDENCE_MAX,
  REPORT_DECISIONS,
  reportDecisionRequest,
  type ReportDecision,
  type ReportDecisionDraft,
} from '../decisions';

const LABELS: Record<ReportDecision, typeof admin_rpt_dismiss> = {
  dismiss: admin_rpt_dismiss,
  disqualify: admin_rpt_disqualify,
};

const STYLES: Record<ReportDecision, string> = {
  dismiss: 'btn btn-outline btn-xs sm:btn-sm md:btn-md',
  disqualify: 'btn btn-error btn-xs sm:btn-sm md:btn-md',
};

export const ReportDecisionForm = ({
  locale,
  targetType,
  targetId,
  canDisqualify,
  isDeciding,
  onDecide,
}: {
  locale: Locale;
  targetType: HackathonReportTarget;
  targetId: string;
  canDisqualify: boolean;
  isDeciding: boolean;
  onDecide: (draft: ReportDecisionDraft) => void;
}) => {
  const id = useId();
  const reasonField = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isMissing, setIsMissing] = useState(false);
  const options = { locale };
  const draftOf = (decision: ReportDecision): ReportDecisionDraft => ({
    targetType,
    targetId,
    decision,
    reason,
    evidence,
  });

  const choose = (decision: ReportDecision) => {
    if (!reportDecisionRequest(draftOf(decision))) {
      setIsMissing(true);
      reasonField.current?.focus();
      return;
    }
    setIsMissing(false);
    onDecide(draftOf(decision));
  };

  const decisions = REPORT_DECISIONS.filter(
    (decision) => decision === 'dismiss' || canDisqualify,
  );

  return (
    <div className="space-y-2 border-t border-base-300 pt-4">
      {canDisqualify ? (
        <>
          <label className="block text-label" htmlFor={`${id}-reason`}>
            {admin_rpt_reason_label({}, options)}
          </label>
          <textarea
            aria-describedby={isMissing ? `${id}-missing` : `${id}-reason-hint`}
            aria-invalid={isMissing || undefined}
            className="textarea textarea-sm md:textarea-md w-full"
            dir="auto"
            id={`${id}-reason`}
            maxLength={DECISION_REASON_MAX}
            onChange={(event) => setReason(event.target.value)}
            ref={reasonField}
            rows={3}
            value={reason}
          />
          <p className="text-caption text-neutral" id={`${id}-reason-hint`}>
            {admin_rpt_reason_hint({}, options)}
          </p>
          <label className="block text-label" htmlFor={`${id}-evidence`}>
            {admin_rpt_evidence_label({}, options)}
          </label>
          <textarea
            aria-describedby={`${id}-evidence-hint`}
            aria-invalid={isMissing || undefined}
            className="textarea textarea-sm md:textarea-md w-full"
            dir="auto"
            id={`${id}-evidence`}
            maxLength={EVIDENCE_MAX}
            onChange={(event) => setEvidence(event.target.value)}
            rows={3}
            value={evidence}
          />
          <p className="text-caption text-neutral" id={`${id}-evidence-hint`}>
            {admin_rpt_evidence_hint({}, options)}
          </p>
          {isMissing ? (
            <p className="text-caption text-error" id={`${id}-missing`}>
              {admin_rpt_needed({ min: String(DECISION_REASON_MIN) }, options)}
            </p>
          ) : null}
        </>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {decisions.map((decision) => (
          <button
            className={STYLES[decision]}
            disabled={isDeciding}
            key={decision}
            onClick={() => choose(decision)}
            type="button"
          >
            {LABELS[decision]({}, options)}
          </button>
        ))}
      </div>
    </div>
  );
};
