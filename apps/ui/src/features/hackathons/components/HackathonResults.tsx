import {
  formatNumber,
  hackathon_prize_overall,
  hackathon_prize_place_value,
  hackathon_results_page_disqualified,
  hackathon_results_page_overall,
  hackathon_results_page_tracks,
  hackathon_results_page_winners,
  hackathon_results_panel_heading,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonPublicResults } from '../api';
import { HackathonResultEntry } from './HackathonResultEntry';

const HEADING_ID = 'hackathon-results-heading';
const LIST = 'mt-2 divide-y divide-base-300 rounded-box border border-base-300';

export const HackathonResults = ({
  results,
  reportEventId = null,
  locale,
}: {
  results: HackathonPublicResults;
  reportEventId?: string | null;
  locale: Locale;
}) => {
  const options = { locale };
  return (
    <section aria-labelledby={HEADING_ID} className="mt-8 grid gap-6">
      <h2 id={HEADING_ID} className="font-display text-h4 font-semibold">
        {hackathon_results_panel_heading({}, options)}
      </h2>
      {results.winners.length > 0 ? (
        <div>
          <h3 className="font-medium">
            {hackathon_results_page_winners({}, options)}
          </h3>
          <ul className={LIST}>
            {results.winners.map((winner) => (
              <li key={winner.prizeId} className="grid gap-1 p-3">
                <p className="text-caption text-neutral">
                  {hackathon_prize_place_value(
                    { place: formatNumber(winner.place, locale) },
                    options,
                  )}
                  {' · '}
                  {winner.trackTitle ? (
                    <bdi>{winner.trackTitle}</bdi>
                  ) : (
                    hackathon_prize_overall({}, options)
                  )}
                </p>
                <p className="font-medium">
                  <bdi className="break-words">{winner.prizeTitle}</bdi>
                </p>
                <p className="text-body-sm">
                  <bdi className="break-words">{winner.title}</bdi>
                  {' · '}
                  <bdi className="break-words">{winner.teamName}</bdi>
                </p>
                {winner.isDisqualified ? (
                  <p className="text-caption font-medium">
                    {hackathon_results_page_disqualified({}, options)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <h3 className="font-medium">
          {hackathon_results_page_overall({}, options)}
        </h3>
        <ol className={LIST}>
          {results.overall.map((result) => (
            <HackathonResultEntry
              key={result.submissionId}
              result={result}
              place={result.rank}
              isDetailed
              reportEventId={reportEventId}
              locale={locale}
            />
          ))}
        </ol>
      </div>
      {results.tracks.length > 0 ? (
        <div className="grid gap-4">
          <h3 className="font-medium">
            {hackathon_results_page_tracks({}, options)}
          </h3>
          {results.tracks.map((track) => (
            <div key={track.trackId}>
              <h4 className="text-body-sm font-medium">
                <bdi className="break-words">{track.title}</bdi>
              </h4>
              <ol className={LIST}>
                {track.entries.map((result) => (
                  <HackathonResultEntry
                    key={result.submissionId}
                    result={result}
                    place={result.trackRank}
                    isDetailed={false}
                    locale={locale}
                  />
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};
