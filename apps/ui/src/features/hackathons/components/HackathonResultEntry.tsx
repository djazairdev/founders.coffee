import {
  formatNumber,
  hackathon_results_page_disqualified,
  hackathon_results_page_criterion_score,
  hackathon_results_page_pr_merged,
  hackathon_results_page_pr_reviewed,
  hackathon_results_page_pr_submitted,
  hackathon_results_panel_rank,
  hackathon_results_panel_tie_settled,
  hackathon_results_panel_total,
  hackathon_results_panel_unranked,
  hackathon_submission_pull_requests,
  type Locale,
} from '@founders-coffee/i18n';
import { IsolatedValue } from '@founders-coffee/ui';

import { HackathonReportButton } from '../../hackathon-reports/components/HackathonReportButton';
import type { HackathonPublicResult } from '../api';

const PULL_REQUEST_STATUS = {
  submitted: hackathon_results_page_pr_submitted,
  reviewed: hackathon_results_page_pr_reviewed,
  merged: hackathon_results_page_pr_merged,
};

export const HackathonResultEntry = ({
  result,
  place,
  isDetailed,
  reportEventId = null,
  locale,
}: {
  result: HackathonPublicResult;
  place: number | null;
  isDetailed: boolean;
  reportEventId?: string | null;
  locale: Locale;
}) => {
  const options = { locale };
  const number = (value: number) =>
    formatNumber(value, locale, { maximumFractionDigits: 2 });
  const scored = result.criteria.filter((criterion) => criterion.mean !== null);
  return (
    <li className="grid gap-1 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-body-sm font-medium">
          {place === null
            ? hackathon_results_panel_unranked({}, options)
            : hackathon_results_panel_rank({ rank: number(place) }, options)}
        </p>
        {result.total === null ? null : (
          <p className="text-body-sm font-medium">
            {hackathon_results_panel_total(
              { total: number(result.total) },
              options,
            )}
          </p>
        )}
      </div>
      <p className="font-medium">
        <bdi className="break-words">{result.title}</bdi>
      </p>
      <p className="text-body-sm text-neutral">
        <bdi className="break-words">{result.teamName}</bdi>
      </p>
      {result.isDisqualified ? (
        <p className="text-caption font-medium">
          {hackathon_results_page_disqualified({}, options)}
        </p>
      ) : null}
      {isDetailed ? (
        <>
          {result.tieNote ? (
            <p className="text-caption text-neutral">
              {hackathon_results_panel_tie_settled({}, options)}
            </p>
          ) : null}
          {scored.length > 0 ? (
            <ul className="mt-1 grid gap-0.5 text-caption text-neutral">
              {scored.map((criterion) => (
                <li key={criterion.criterionId}>
                  <IsolatedValue
                    value={criterion.name}
                    message={(name) =>
                      hackathon_results_page_criterion_score(
                        {
                          name,
                          score: number(criterion.mean ?? 0),
                          scale: number(criterion.scale),
                        },
                        options,
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {result.pullRequests.length > 0 ? (
            <div className="mt-1 grid gap-1">
              <p className="text-caption text-neutral">
                {hackathon_submission_pull_requests({}, options)}
              </p>
              <ul className="grid gap-1 text-body-sm">
                {result.pullRequests.map((pullRequest) => (
                  <li
                    key={pullRequest.url}
                    className="flex min-w-0 flex-wrap items-center gap-2"
                  >
                    <a
                      href={pullRequest.url}
                      dir="ltr"
                      rel="noopener noreferrer"
                      target="_blank"
                      className="link break-all"
                    >
                      {pullRequest.url.replace(/^https:\/\//u, '')}
                    </a>
                    <span className="badge badge-sm badge-soft">
                      {PULL_REQUEST_STATUS[pullRequest.status]({}, options)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
      {reportEventId && !result.isDisqualified ? (
        <HackathonReportButton
          eventId={reportEventId}
          targetType="submission"
          targetId={result.submissionId}
          name={result.title}
          locale={locale}
        />
      ) : null}
    </li>
  );
};
