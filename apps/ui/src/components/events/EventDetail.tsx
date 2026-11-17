import { Link } from '@tanstack/react-router';
import { CalendarDays, Users } from 'lucide-react';

import { eventLanguages, textLanguage } from '@founders-coffee/core';
import {
  back_to_city,
  cityInputs,
  event_timezone,
  event_when,
  localizedName,
  going_count,
  role_host,
  share_event_action,
  type Locale,
} from '@founders-coffee/i18n';
import type { Market } from '@founders-coffee/db';
import type {
  EventDetailItem,
  PublicProfile,
} from '@founders-coffee/server-fns';

import { EventChat } from '../../features/chat/components/EventChat';
import { eventCityName } from '../../features/events/event-city-name';
import { eventStreetAddress } from '../../features/events/event-street-address';
import type { EventPhase } from '../../features/events/live-window';
import type { UseEventLiveResult } from '../../features/events/useEventLive';
import type {
  HackathonPageDetails as Details,
  HackathonSchedule as Schedule,
} from '../../features/hackathons/api';
import { HackathonEventDetail } from '../../features/hackathons/components/HackathonEventDetail';
import { localizedCity } from '../../lib/locale-routing';
import { EventCancelledNotice } from './EventCancelledNotice';
import { EventCityBadge } from './EventCityBadge';
import { EventFormatBadge } from './EventFormatBadge';
import { EventHostCard, type EventOrganisers } from './EventHostCard';
import { EventCoHosts } from './EventCoHosts';
import { eventDetailsTitle } from './event-details-title';
import { eventDayLabel } from './event-time';
import { EventKindBadge } from './EventKindBadge';
import { EventRunByBadge } from './EventRunByBadge';
import { EventTopics } from './EventTopics';
import { EventWhere } from './EventWhere';
import { EventLocationMap } from './EventLocationMap';
import { EventRsvpBox } from './EventRsvpBox';
import { EventTimeRange } from './EventTimeRange';
import { ShareEventButton } from './ShareEventButton';
import { EventDescription } from './EventDescription';

type EventDetailProps = {
  locale: Locale;
  market: Market;
  event: EventDetailItem;
  host: PublicProfile | null;
  isHost: boolean;
  live: UseEventLiveResult | null;
  isWindowOpen: boolean;
  phase: EventPhase;
  mapboxToken: string | null;
  hackathon?: Schedule | null;
  details?: Details | null;
  organisations?: EventOrganisers;
  canReport?: boolean;
};

export const EventDetail = ({
  locale,
  market,
  event,
  host,
  isHost,
  live,
  isWindowOpen,
  phase,
  mapboxToken,
  hackathon = null,
  details = null,
  organisations = [],
  canReport = false,
}: EventDetailProps) => {
  const hostName = host?.displayName ?? role_host({}, { locale });
  const start = new Date(event.startsAt);
  const end = event.endsAt == null ? null : new Date(event.endsAt);
  const day = eventDayLabel(start, locale, market.timezone);
  const timeRange = (
    <EventTimeRange
      locale={locale}
      timeZone={market.timezone}
      start={start}
      end={end}
    />
  );

  const cityName = eventCityName(event, locale);
  const streetAddress = eventStreetAddress(event);
  const contentDirection = locale === 'ar' ? 'rtl' : 'ltr';
  const isCancelled = event.status === 'cancelled';
  const isGoing = event.viewerRsvp === 'going';
  const languages = eventLanguages(event);
  const isChatAvailable = market.featureFlags.meetupChat === true;
  const hasRsvpBox =
    event.kind !== 'hackathon' &&
    (isCancelled ? (isHost ? isChatAvailable : isGoing) : true);
  if (event.kind === 'hackathon')
    return (
      <HackathonEventDetail
        locale={locale}
        market={market}
        event={event}
        host={host}
        organisations={organisations}
        isHost={isHost}
        mapboxToken={mapboxToken}
        schedule={hackathon}
        details={details ?? null}
        canReport={canReport}
      />
    );

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

      {isCancelled && (
        <EventCancelledNotice
          reason={event.cancellationReason}
          locale={locale}
        />
      )}

      <header className="rounded-box bg-base-200 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <EventKindBadge kind={event.kind} locale={locale} />
          <EventRunByBadge runBy={event.runBy} locale={locale} />
          <EventFormatBadge format={event.format} locale={locale} />
          <EventCityBadge cityName={cityName} />
        </div>
        <h1 className="mt-4 font-display text-h3 font-semibold text-balance md:text-h2">
          <bdi lang={textLanguage(event.title, languages)}>{event.title}</bdi>
        </h1>
        <EventCoHosts
          runBy={event.runBy}
          locale={locale}
          isLinked
          className="mt-3"
        />
        {event.description ? (
          <EventDescription
            locale={locale}
            kind={event.kind}
            value={event.description}
            languages={languages}
          />
        ) : null}
        <EventTopics locale={locale} tags={event.tags} className="mt-4" />
        <div className="mt-6 flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-base-100 px-3 py-2 text-body-sm font-medium">
            <CalendarDays
              className="size-4 text-secondary"
              aria-hidden="true"
            />
            <time dateTime={start.toISOString()} dir={contentDirection}>
              {day} · {timeRange}
            </time>
          </span>
          {event.goingCount > 0 && !isCancelled ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary-tint px-3 py-2 text-body-sm font-medium text-accent">
              <Users className="size-4" aria-hidden="true" />
              {going_count({ count: event.goingCount }, { locale })}
            </span>
          ) : null}
          {isCancelled ? null : (
            <ShareEventButton
              locale={locale}
              eventId={event.id}
              title={event.title}
              label={share_event_action({}, { locale })}
            />
          )}
        </div>
      </header>

      {event.venue !== null &&
      event.latitude != null &&
      event.longitude != null ? (
        <div className="mt-4 w-full">
          <EventLocationMap
            locale={locale}
            venue={event.venue}
            latitude={event.latitude}
            longitude={event.longitude}
            mapboxToken={mapboxToken}
          />
        </div>
      ) : null}

      <h2
        id="event-details-title"
        className="mt-8 font-display text-h4 font-semibold"
      >
        {eventDetailsTitle(event.kind, locale)}
      </h2>

      <div
        className={`mt-4 grid gap-8 ${hasRsvpBox ? 'lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]' : ''}`}
      >
        <div className="flex flex-col">
          <section
            aria-labelledby="event-details-title"
            className="flex flex-1 flex-col"
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-box border border-base-300 bg-base-100 p-4">
                <dt className="eyebrow">{event_when({}, { locale })}</dt>
                <dd className="mt-1.5 flex items-start gap-2 font-medium">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-secondary"
                    aria-hidden="true"
                  />
                  <time dateTime={start.toISOString()}>{day}</time>
                </dd>
                <dd className="mt-0.5 ms-6 overflow-x-clip text-body-sm text-neutral">
                  <span className="-ms-4 flex flex-wrap">
                    <span className="ms-4 font-medium text-base-content">
                      {timeRange}
                    </span>
                    <span className="relative ms-4 before:absolute before:-start-2.5 before:content-['·']">
                      {event_timezone(
                        { market: localizedName(market, locale) },
                        { locale },
                      )}
                    </span>
                  </span>
                </dd>
              </div>
              <EventWhere
                locale={locale}
                event={event}
                place={streetAddress ?? cityName}
                isCancelled={isCancelled}
              />
            </dl>

            <EventHostCard
              locale={locale}
              host={host}
              cityName={cityName}
              isHost={isHost}
              organisations={organisations}
            />
          </section>
        </div>

        {hasRsvpBox ? (
          <EventRsvpBox
            locale={locale}
            event={event}
            hostName={hostName}
            marketSlug={market.slug}
            isHost={isHost}
            live={live}
            isWindowOpen={isWindowOpen}
            phase={phase}
            isChatAvailable={isChatAvailable}
          />
        ) : null}
      </div>

      {isChatAvailable ? (
        <EventChat
          locale={locale}
          eventId={event.id}
          title={event.title}
          isMember={isHost || isGoing}
          isCancelled={isCancelled}
          endsAt={end}
          timeZone={market.timezone}
        />
      ) : null}
    </article>
  );
};
