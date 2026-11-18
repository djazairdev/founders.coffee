import type { Locale } from '@founders-coffee/i18n';

import type {
  HackathonPageDetails,
  HackathonSchedule as Schedule,
} from '../api';
import { HackathonSchedule } from './HackathonSchedule';

export const HackathonAside = ({
  schedule,
  details,
  isCancelled,
  timeZone,
  locale,
}: {
  schedule: Schedule;
  details: HackathonPageDetails | null;
  isCancelled: boolean;
  timeZone: string;
  locale: Locale;
}) => (
  <div className="flex flex-col gap-4">
    <HackathonSchedule
      schedule={schedule}
      locale={locale}
      timeZone={timeZone}
      isCancelled={isCancelled}
      hasResults={Boolean(details?.results)}
    />
  </div>
);
