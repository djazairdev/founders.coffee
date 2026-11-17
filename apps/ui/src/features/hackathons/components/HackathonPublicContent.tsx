import { eventLanguages } from '@founders-coffee/core';
import type { Market } from '@founders-coffee/db';
import type { Locale } from '@founders-coffee/i18n';
import type { EventDetailItem } from '@founders-coffee/server-fns';

import { EventDescription } from '../../../components/events/EventDescription';
import { EventLocationMap } from '../../../components/events/EventLocationMap';
import { EventWhere } from '../../../components/events/EventWhere';
import type { HackathonPageDetails, HackathonSchedule } from '../api';
import { HackathonAside } from './HackathonAside';
import { HackathonPageDetails as HackathonDetails } from './HackathonPageDetails';

type HackathonPublicContentProps = {
  event: EventDetailItem;
  locale: Locale;
  market: Market;
  schedule: HackathonSchedule | null;
  details: HackathonPageDetails | null;
  mapboxToken: string | null;
  canReport: boolean;
  isCancelled: boolean;
};

export const HackathonPublicContent = ({
  event,
  locale,
  market,
  schedule,
  details,
  mapboxToken,
  canReport,
  isCancelled,
}: HackathonPublicContentProps) => (
  <div
    className={`mt-6 grid min-w-0 gap-8 ${schedule ? 'lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.78fr)]' : ''}`}
  >
    {schedule ? (
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        <HackathonAside
          schedule={schedule}
          details={details}
          isCancelled={isCancelled}
          timeZone={market.timezone}
          locale={locale}
        />
      </div>
    ) : null}
    <div className="min-w-0 lg:col-start-1 lg:row-start-1">
      {event.meetingLink ? (
        <dl className="mb-8">
          <EventWhere
            locale={locale}
            event={event}
            place={null}
            isCancelled={isCancelled}
            showLocation={false}
          />
        </dl>
      ) : null}
      {event.description ? (
        <EventDescription
          locale={locale}
          kind={event.kind}
          value={event.description}
          languages={eventLanguages(event)}
        />
      ) : null}
      {details ? (
        <HackathonDetails
          details={details}
          market={market}
          reportEventId={canReport ? event.id : null}
          locale={locale}
        />
      ) : null}
      {event.venue !== null &&
      event.latitude !== null &&
      event.longitude !== null ? (
        <div className="mt-8 w-full">
          <EventLocationMap
            locale={locale}
            venue={event.venue}
            latitude={event.latitude}
            longitude={event.longitude}
            mapboxToken={mapboxToken}
          />
        </div>
      ) : null}
    </div>
  </div>
);
