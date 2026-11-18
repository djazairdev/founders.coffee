import {
  formatNumber,
  hackathon_results_page_disqualified,
  hackathon_results_panel_disqualified_prize,
  hackathon_results_panel_rank,
  hackathon_results_panel_tie_settled,
  hackathon_results_panel_tied,
  hackathon_results_panel_total,
  hackathon_results_panel_track_rank,
  hackathon_results_panel_unranked,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonResultsEntry } from '../api';

export const HackathonResultsList = ({
  entries,
  locale,
}: {
  entries: readonly HackathonResultsEntry[];
  locale: Locale;
}) => {
  const options = { locale };
  const number = (value: number) =>
    formatNumber(value, locale, { maximumFractionDigits: 2 });
  return (
    <ul className="mt-4 divide-y divide-base-300 rounded-box border border-base-300">
      {entries.map((entry) => (
        <li
          key={entry.submissionId}
          className="flex flex-wrap items-start justify-between gap-2 p-3"
        >
          <div className="grid min-w-0 gap-1">
            <p className="font-medium">
              {entry.rank === null
                ? hackathon_results_panel_unranked({}, options)
                : hackathon_results_panel_rank(
                    { rank: number(entry.rank) },
                    options,
                  )}
            </p>
            <h3 className="font-medium">
              <bdi className="break-words">{entry.title}</bdi>
            </h3>
            <p className="text-body-sm text-neutral">
              <bdi className="break-words">{entry.teamName}</bdi>
            </p>
            {entry.trackTitle ? (
              <p className="text-caption text-neutral">
                <bdi className="break-words">{entry.trackTitle}</bdi>
                {entry.trackRank === null ? null : (
                  <>
                    {' · '}
                    {hackathon_results_panel_track_rank(
                      { rank: number(entry.trackRank) },
                      options,
                    )}
                  </>
                )}
              </p>
            ) : null}
            {entry.tieNote ? (
              <p className="text-caption text-neutral">
                {hackathon_results_panel_tie_settled({}, options)}
              </p>
            ) : null}
            {entry.isDisqualified ? (
              <p className="text-caption font-medium">
                {hackathon_results_page_disqualified({}, options)}{' '}
                {hackathon_results_panel_disqualified_prize({}, options)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {entry.isTied ? (
              <span className="badge badge-sm badge-soft badge-warning">
                {hackathon_results_panel_tied({}, options)}
              </span>
            ) : null}
            {entry.total === null ? null : (
              <span className="text-body-sm font-medium">
                {hackathon_results_panel_total(
                  { total: number(entry.total) },
                  options,
                )}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
