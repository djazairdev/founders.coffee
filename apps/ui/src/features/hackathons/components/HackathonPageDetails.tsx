import type { Market } from '@founders-coffee/db';
import type { Locale } from '@founders-coffee/i18n';

import type { HackathonPageDetails as Details } from '../api';
import { HackathonJudges } from './HackathonJudges';
import { HackathonMentors } from './HackathonMentors';
import { HackathonPrizes, HackathonTracks } from './HackathonOffer';
import { HackathonResults } from './HackathonResults';
import { HackathonWorkshops } from './HackathonWorkshops';

export const HackathonPageDetails = ({
  details,
  market,
  reportEventId = null,
  locale,
}: {
  details: Details;
  market: Market;
  reportEventId?: string | null;
  locale: Locale;
}) => (
  <div className="*:first:mt-0 lg:col-start-1">
    <HackathonTracks tracks={details.tracks} locale={locale} />
    <HackathonPrizes offer={details} locale={locale} />
    {details.judges.length > 0 ? (
      <HackathonJudges judges={details.judges} locale={locale} />
    ) : null}
    {details.mentors.length > 0 ? (
      <HackathonMentors mentors={details.mentors} locale={locale} />
    ) : null}
    {details.workshops.length > 0 ? (
      <HackathonWorkshops
        workshops={details.workshops}
        market={market}
        locale={locale}
      />
    ) : null}
    {details.results ? (
      <HackathonResults
        results={details.results}
        reportEventId={reportEventId}
        locale={locale}
      />
    ) : null}
  </div>
);
