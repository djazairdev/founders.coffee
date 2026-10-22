import {
  admin_hkn_market,
  admin_rpt_entry,
  admin_rpt_entry_disqualified,
  admin_rpt_first_reported,
  admin_rpt_hackathon,
  admin_rpt_no_entry,
  admin_rpt_reasons,
  admin_rpt_reports,
  admin_rpt_team,
  admin_rpt_team_gone,
  formatDate,
  formatNumber,
  type Locale,
} from '@founders-coffee/i18n';

import type { ReportQueueItem } from '../api';
import type { ReportDecisionDraft } from '../decisions';
import { REPORT_REASON_LABELS, REPORT_TARGET_LABELS } from '../labels';
import { ReportDecisionForm } from './ReportDecisionForm';

export const ReportCard = ({
  locale,
  item,
  isDeciding,
  onDecide,
}: {
  locale: Locale;
  item: ReportQueueItem;
  isDeciding: boolean;
  onDecide: (draft: ReportDecisionDraft) => void;
}) => {
  const options = { locale };
  const { entry } = item;
  return (
    <li className="space-y-3 rounded-box border border-base-300 p-5">
      <p className="text-caption text-neutral">
        {REPORT_TARGET_LABELS[item.targetType]({}, options)}
      </p>
      <h2 className="text-h4 font-medium">
        <bdi>
          {item.targetType === 'submission' && entry
            ? entry.title
            : (item.teamName ?? admin_rpt_team_gone({}, options))}
        </bdi>
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
        <dt className="text-neutral">{admin_rpt_hackathon({}, options)}</dt>
        <dd>
          <bdi>{item.eventTitle}</bdi>
        </dd>
        <dt className="text-neutral">{admin_hkn_market({}, options)}</dt>
        <dd>
          <bdi>{item.marketCode}</bdi>
        </dd>
        <dt className="text-neutral">{admin_rpt_team({}, options)}</dt>
        <dd>
          <bdi>{item.teamName ?? admin_rpt_team_gone({}, options)}</bdi>
        </dd>
        <dt className="text-neutral">{admin_rpt_entry({}, options)}</dt>
        <dd className="min-w-0">
          {entry ? (
            <>
              <bdi>{entry.title}</bdi>
              {entry.status === 'disqualified' ? (
                <span className="badge badge-sm badge-soft badge-error ms-2">
                  {admin_rpt_entry_disqualified({}, options)}
                </span>
              ) : null}
              <a
                className="link link-hover block break-all text-secondary"
                dir="ltr"
                href={entry.repositoryUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {entry.repositoryUrl}
              </a>
            </>
          ) : (
            admin_rpt_no_entry({}, options)
          )}
        </dd>
        <dt className="text-neutral">{admin_rpt_reports({}, options)}</dt>
        <dd>{formatNumber(item.reports, locale)}</dd>
        <dt className="text-neutral">{admin_rpt_reasons({}, options)}</dt>
        <dd>
          <ul className="flex flex-wrap gap-1">
            {item.reasons.map((reason) => (
              <li className="badge badge-sm badge-ghost" key={reason}>
                {REPORT_REASON_LABELS[reason]({}, options)}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      <p className="text-caption text-neutral">
        {admin_rpt_first_reported(
          {
            date: formatDate(new Date(item.firstReportedAt), locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: item.timeZone,
            }),
          },
          options,
        )}
      </p>
      <ReportDecisionForm
        canDisqualify={item.teamId !== null}
        isDeciding={isDeciding}
        locale={locale}
        onDecide={onDecide}
        targetId={item.targetId}
        targetType={item.targetType}
      />
    </li>
  );
};
