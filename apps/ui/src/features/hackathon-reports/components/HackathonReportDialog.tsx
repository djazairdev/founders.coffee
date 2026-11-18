import { useEffect, useId, useRef, useState } from 'react';

import {
  appErrorCode,
  HACKATHON_REPORT_REASONS,
  type HackathonReportReason,
  type HackathonReportTarget,
} from '@founders-coffee/core';
import {
  cancel,
  hackathon_report_body,
  hackathon_report_confirm,
  hackathon_report_error,
  hackathon_report_own_team,
  hackathon_report_reason,
  hackathon_report_reason_harassment,
  hackathon_report_reason_other,
  hackathon_report_reason_plagiarism,
  hackathon_report_reason_rule_breaking,
  hackathon_report_reason_spam,
  hackathon_report_title_submission,
  hackathon_report_title_team,
  hackathon_report_unavailable,
  rate_limited,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { ReportReasons } from '../../../components/ReportReasons';
import { useReportHackathonTarget } from '../hooks';

const REASON_LABELS = {
  plagiarism: hackathon_report_reason_plagiarism,
  rule_breaking: hackathon_report_reason_rule_breaking,
  harassment: hackathon_report_reason_harassment,
  spam: hackathon_report_reason_spam,
  other: hackathon_report_reason_other,
} as const satisfies Record<HackathonReportReason, unknown>;

const TITLES = {
  submission: hackathon_report_title_submission,
  team: hackathon_report_title_team,
} as const satisfies Record<HackathonReportTarget, unknown>;

const failureOf = (error: unknown, locale: Locale): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'rate_limited':
      return rate_limited({}, options);
    case 'own_team_report':
      return hackathon_report_own_team({}, options);
    case 'report_target_not_found':
      return hackathon_report_unavailable({}, options);
    default:
      return hackathon_report_error({}, options);
  }
};

export const HackathonReportDialog = ({
  eventId,
  targetType,
  targetId,
  locale,
  onClose,
  onDone,
}: {
  eventId: string;
  targetType: HackathonReportTarget;
  targetId: string;
  locale: Locale;
  onClose: () => void;
  onDone: (outcome: 'sent' | 'already') => void;
}) => {
  const options = { locale };
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState<HackathonReportReason | null>(null);
  const report = useReportHackathonTarget();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const send = () => {
    if (!reason || report.isPending) return;
    report.mutate(
      { eventId, targetType, targetId, reason },
      {
        onSuccess: () => onDone('sent'),
        onError: (error: unknown) => {
          if (appErrorCode(error) === 'already_reported') onDone('already');
        },
      },
    );
  };

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div className="modal-box max-w-sm rounded-box border border-base-300 bg-base-100">
        <h2 id={titleId} className="font-display text-h4 font-semibold">
          {TITLES[targetType]({}, options)}
        </h2>
        <p className="mt-2 text-body-sm leading-relaxed text-neutral">
          {hackathon_report_body({}, options)}
        </p>
        <ReportReasons
          legend={hackathon_report_reason({}, options)}
          reasons={HACKATHON_REPORT_REASONS.map((value) => ({
            value,
            label: REASON_LABELS[value]({}, options),
          }))}
          value={reason}
          isDisabled={report.isPending}
          onChange={setReason}
        />
        {report.isError ? (
          <StatusMessage variant="error" className="mt-4">
            {failureOf(report.error, locale)}
          </StatusMessage>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-xs sm:btn-sm md:btn-md"
            disabled={report.isPending}
            onClick={onClose}
          >
            {cancel({}, options)}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
            aria-busy={report.isPending}
            disabled={!reason || report.isPending}
            onClick={send}
          >
            {hackathon_report_confirm({}, options)}
          </button>
        </div>
      </div>
    </dialog>
  );
};
