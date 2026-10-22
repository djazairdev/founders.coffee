import {
  formatNumber,
  hackathon_judging_empty,
  hackathon_judging_entries_heading,
  hackathon_judging_progress,
  hackathon_judging_recused_count,
  hackathon_judging_state_recused,
  hackathon_judging_state_scored,
  hackathon_judging_state_to_score,
  type Locale,
} from '@founders-coffee/i18n';

import type { JudgePageEntry, JudgePageView } from '../api';

const HEADING_ID = 'hackathon-judging-entries-heading';

const STATE_BADGE: Record<JudgePageEntry['state'], string> = {
  to_score: 'badge-warning',
  scored: 'badge-success',
  recused: 'badge-ghost',
};

const stateLabel = (state: JudgePageEntry['state'], locale: Locale) => {
  const options = { locale };
  if (state === 'scored') return hackathon_judging_state_scored({}, options);
  return state === 'recused'
    ? hackathon_judging_state_recused({}, options)
    : hackathon_judging_state_to_score({}, options);
};

export const HackathonJudgeEntries = ({
  entries,
  progress,
  locale,
}: {
  entries: JudgePageView['entries'];
  progress: JudgePageView['progress'];
  locale: Locale;
}) => {
  const number = (value: number) => formatNumber(value, locale);
  const total = progress.scored + progress.toScore;
  return (
    <section aria-labelledby={HEADING_ID} className="mt-6">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_judging_entries_heading({}, { locale })}
      </h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-body-sm text-neutral">
          {hackathon_judging_empty({}, { locale })}
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-1">
            <p className="text-body-sm font-medium">
              {hackathon_judging_progress(
                { scored: number(progress.scored), total: number(total) },
                { locale },
              )}
            </p>
            {total > 0 ? (
              <progress
                className="progress progress-secondary w-full"
                value={progress.scored}
                max={total}
                aria-hidden="true"
              />
            ) : null}
            {progress.recused > 0 ? (
              <p className="text-caption text-neutral">
                {hackathon_judging_recused_count(
                  { count: number(progress.recused) },
                  { locale },
                )}
              </p>
            ) : null}
          </div>
          <ul className="mt-4 divide-y divide-base-300 rounded-box border border-base-300">
            {entries.map((entry) => (
              <li
                key={entry.submissionId}
                className="flex flex-wrap items-start justify-between gap-2 p-3"
              >
                <div className="grid min-w-0 gap-1">
                  <h3 className="font-medium">
                    <bdi className="break-words">{entry.title}</bdi>
                  </h3>
                  <p className="text-body-sm text-neutral">
                    <bdi className="break-words">{entry.teamName}</bdi>
                  </p>
                  {entry.trackTitle ? (
                    <p className="text-caption text-neutral">
                      <bdi className="break-words">{entry.trackTitle}</bdi>
                    </p>
                  ) : null}
                </div>
                <span
                  className={`badge badge-sm badge-soft ${STATE_BADGE[entry.state]}`}
                >
                  {stateLabel(entry.state, locale)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
