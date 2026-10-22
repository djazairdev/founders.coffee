import type { Market } from '@founders-coffee/db';
import type { Locale } from '@founders-coffee/i18n';

import type { HackathonPageDetails as Details } from '../api';
import { HackathonJudges } from './HackathonJudges';
import { HackathonMentors } from './HackathonMentors';
import { HackathonOffer } from './HackathonOffer';
import { HackathonRules } from './HackathonRules';
import { HackathonWorkshops } from './HackathonWorkshops';

export const HackathonPageDetails = ({
  details,
  market,
  locale,
}: {
  details: Details;
  market: Market;
  locale: Locale;
}) => (
  <>
    <HackathonRules rules={details.rules} locale={locale} />
    <HackathonOffer offer={details} locale={locale} />
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
  </>
);
