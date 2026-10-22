import { Link } from '@tanstack/react-router';

import type { Market } from '@founders-coffee/db';
import {
  hackathon_market_empty,
  hackathon_market_heading,
  hackathon_schedule_summary,
  type Locale,
} from '@founders-coffee/i18n';

import { localizedEvent } from '../../../lib/locale-routing';
import type { MarketHackathon } from '../api';
import { phaseSentence, scheduleDay } from '../schedule';

const HEADING_ID = 'market-hackathons-title';

type MarketHackathonsProps = {
  locale: Locale;
  market: Market;
  hackathons: readonly MarketHackathon[];
  isAnnounced: boolean;
  className?: string;
};

const HackathonCard = ({
  hackathon,
  locale,
  market,
}: {
  hackathon: MarketHackathon;
  locale: Locale;
  market: Market;
}) => {
  const { schedule } = hackathon;
  const day = (at: number) => scheduleDay(at, locale, market.timezone);
  return (
    <li>
      <Link
        {...localizedEvent(locale, market.slug, hackathon.slug)}
        className="card graph-paper flex h-full flex-col gap-2 rounded-box border border-base-300 bg-base-100 px-4 py-3 text-base-content transition-shadow duration-200 ease-out hover:shadow-[var(--shadow-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary motion-reduce:transition-none"
      >
        <h3 className="font-display text-body-lg font-semibold leading-tight tracking-tight break-words">
          <bdi>{hackathon.title}</bdi>
        </h3>
        <p className="text-body-sm font-medium text-primary">
          {phaseSentence(schedule, locale, market.timezone)}
        </p>
        <p className="text-caption text-neutral">
          {hackathon_schedule_summary(
            { kickoff: day(schedule.kickoffAt), demoDay: day(schedule.endsAt) },
            { locale },
          )}
        </p>
      </Link>
    </li>
  );
};

export const MarketHackathons = ({
  locale,
  market,
  hackathons,
  isAnnounced,
  className = '',
}: MarketHackathonsProps) => {
  if (!market.featureFlags.hackathons) return null;
  if (hackathons.length === 0 && isAnnounced) return null;
  return (
    <section aria-labelledby={HEADING_ID} className={className}>
      <h2
        id={HEADING_ID}
        className="font-display text-h3 font-semibold tracking-tight text-base-content"
      >
        {hackathon_market_heading({}, { locale })}
      </h2>
      {hackathons.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hackathons.map((hackathon) => (
            <HackathonCard
              key={hackathon.id}
              hackathon={hackathon}
              locale={locale}
              market={market}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-body-sm text-neutral">
          {hackathon_market_empty({}, { locale })}
        </p>
      )}
    </section>
  );
};
