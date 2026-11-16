import { Link } from '@tanstack/react-router';

import { back_to_city, cityInputs, type Locale } from '@founders-coffee/i18n';
import type { Market } from '@founders-coffee/db';
import type {
  EventDetailItem,
  PublicProfile,
} from '@founders-coffee/server-fns';

import { EventCancelledNotice } from '../../../components/events/EventCancelledNotice';
import { EventChat } from '../../chat/components/EventChat';
import { eventCityName } from '../../events/event-city-name';
import type { HackathonPageDetails, HackathonSchedule } from '../api';
import { localizedCity } from '../../../lib/locale-routing';
import { HackathonPublicContent } from './HackathonPublicContent';
import { HackathonPublicHero } from './HackathonPublicHero';

export const HackathonEventDetail = ({
  locale,
  market,
  event,
  host,
  isHost,
  mapboxToken,
  schedule,
  details,
  canReport,
}: {
  locale: Locale;
  market: Market;
  event: EventDetailItem;
  host: PublicProfile | null;
  isHost: boolean;
  mapboxToken: string | null;
  schedule: HackathonSchedule | null;
  details: HackathonPageDetails | null;
  canReport: boolean;
}) => {
  const cityName = eventCityName(event, locale);
  const isCancelled = event.status === 'cancelled';
  const isGoing = event.viewerRsvp === 'going';

  return (
    <article className="mx-auto max-w-5xl px-4 py-6 sm:py-8 md:px-8 md:py-10">
      {event.citySlug && cityName ? (
        <Link
          {...localizedCity(locale, market.slug, event.citySlug)}
          className="mb-4 inline-flex min-h-6 items-center text-body-sm font-medium underline decoration-secondary underline-offset-[3px] hover:text-accent"
        >
          {back_to_city(cityInputs(cityName), { locale })}
        </Link>
      ) : null}
      {isCancelled ? (
        <EventCancelledNotice
          reason={event.cancellationReason}
          locale={locale}
        />
      ) : null}
      <HackathonPublicHero
        event={event}
        host={host}
        market={market}
        locale={locale}
        isCancelled={isCancelled}
      />
      <HackathonPublicContent
        event={event}
        locale={locale}
        market={market}
        schedule={schedule}
        details={details}
        mapboxToken={mapboxToken}
        canReport={canReport}
        isCancelled={isCancelled}
      />
      {market.featureFlags.meetupChat === true ? (
        <EventChat
          locale={locale}
          eventId={event.id}
          title={event.title}
          isMember={isHost || isGoing}
          isCancelled={isCancelled}
          endsAt={event.endsAt}
          timeZone={market.timezone}
        />
      ) : null}
    </article>
  );
};
