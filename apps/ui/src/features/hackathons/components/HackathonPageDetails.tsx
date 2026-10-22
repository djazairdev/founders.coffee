import type { Locale } from '@founders-coffee/i18n';

import type { HackathonPageDetails as Details } from '../api';
import { HackathonJudges } from './HackathonJudges';
import { HackathonOffer } from './HackathonOffer';
import { HackathonRules } from './HackathonRules';

export const HackathonPageDetails = ({
  details,
  locale,
}: {
  details: Details;
  locale: Locale;
}) => (
  <>
    <HackathonRules rules={details.rules} locale={locale} />
    <HackathonOffer offer={details} locale={locale} />
    {details.judges.length > 0 ? (
      <HackathonJudges judges={details.judges} locale={locale} />
    ) : null}
  </>
);
