import type { EventFormat } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type {
  HackathonPageDetails,
  HackathonSchedule as Schedule,
} from '../api';
import { HackathonRegistrationCard } from './HackathonRegistrationCard';
import { HackathonSchedule } from './HackathonSchedule';

export const HackathonAside = ({
  eventId,
  format,
  schedule,
  details,
  isCancelled,
  timeZone,
  locale,
}: {
  eventId: string;
  format: EventFormat;
  schedule: Schedule;
  details: HackathonPageDetails | null;
  isCancelled: boolean;
  timeZone: string;
  locale: Locale;
}) => (
  <div className="flex flex-col gap-4 self-start">
    {details?.registration && !isCancelled ? (
      <HackathonRegistrationCard
        eventId={eventId}
        format={format}
        minimumAge={details.rules.minimumAge}
        schedule={schedule}
        registration={details.registration}
        timeZone={timeZone}
        locale={locale}
      />
    ) : null}
    <HackathonSchedule
      schedule={schedule}
      locale={locale}
      timeZone={timeZone}
      isCancelled={isCancelled}
    />
  </div>
);
