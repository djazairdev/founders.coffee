import { Link } from '@tanstack/react-router';
import { Building2, CalendarDays, MapPin } from 'lucide-react';

import { eventLanguages, textLanguage } from '@founders-coffee/core';
import {
  event_host,
  event_timezone,
  event_when,
  event_where,
  localizedName,
  share_event_action,
  type Locale,
} from '@founders-coffee/i18n';
import type { Market } from '@founders-coffee/db';
import type {
  EventDetailItem,
  PublicProfile,
} from '@founders-coffee/server-fns';

import { eventCityName } from '../../events/event-city-name';
import { eventStreetAddress } from '../../events/event-street-address';
import { EventCoHosts } from '../../../components/events/EventCoHosts';
import { EventFormatBadge } from '../../../components/events/EventFormatBadge';
import { EventKindBadge } from '../../../components/events/EventKindBadge';
import { EventTimeRange } from '../../../components/events/EventTimeRange';
import { ShareEventButton } from '../../../components/events/ShareEventButton';
import { eventDayLabel } from '../../../components/events/event-time';
import { localizedPublicProfile } from '../../../lib/locale-routing';
import { hackathonSummary } from '../hackathon-summary';

export const HackathonPublicHero = ({
  event,
  host,
  market,
  locale,
  isCancelled,
}: {
  event: EventDetailItem;
  host: PublicProfile | null;
  market: Market;
  locale: Locale;
  isCancelled: boolean;
}) => {
  const options = { locale };
  const cityName = eventCityName(event, locale);
  const streetAddress = eventStreetAddress(event);
  const languages = eventLanguages(event);
  const summary = event.description
    ? hackathonSummary(event.description)
    : null;
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const locationParts = [event.venue, streetAddress, cityName]
    .filter((part): part is string => part !== null)
    .filter((part, index, parts) => parts.indexOf(part) === index);

  return (
    <header className="rounded-box bg-base-200 p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <EventKindBadge kind="hackathon" locale={locale} />
        <EventFormatBadge format={event.format} locale={locale} showInPerson />
      </div>
      <h1 className="mt-4 break-words font-display text-h3 font-semibold text-balance md:text-h2">
        <bdi lang={textLanguage(event.title, languages)}>{event.title}</bdi>
      </h1>
      <EventCoHosts
        runBy={event.runBy}
        locale={locale}
        isLinked
        className="mt-3"
      />
      {host ? (
        <p className="mt-2 flex items-start gap-1.5 text-body-sm text-neutral">
          <Building2
            className="mt-0.5 size-4 shrink-0 text-secondary"
            aria-hidden="true"
          />
          <span>
            <span className="sr-only">{event_host({}, options)} </span>
            <Link
              {...localizedPublicProfile(locale, host.userId)}
              className="link link-hover"
            >
              <bdi>{host.displayName}</bdi>
            </Link>
          </span>
        </p>
      ) : null}
      {summary ? (
        <p className="mt-4 max-w-3xl text-body-md leading-relaxed text-neutral">
          <bdi dir="auto" lang={textLanguage(summary, languages) ?? undefined}>
            {summary}
          </bdi>
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-full bg-base-100 px-3 py-2 text-body-sm font-medium">
          <CalendarDays
            className="size-4 shrink-0 text-secondary"
            aria-hidden="true"
          />
          <span className="sr-only">{event_when({}, options)} </span>
          <time dateTime={start.toISOString()}>
            <bdi>{eventDayLabel(start, locale, market.timezone)}</bdi>
            {' · '}
            <EventTimeRange
              locale={locale}
              timeZone={market.timezone}
              start={start}
              end={end}
            />
            {' · '}
            <span className="text-neutral">
              {event_timezone(
                { market: localizedName(market, locale) },
                options,
              )}
            </span>
          </time>
        </span>
        {locationParts.length > 0 ? (
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-base-100 px-3 py-2 text-body-sm font-medium">
            <MapPin
              className="size-4 shrink-0 text-secondary"
              aria-hidden="true"
            />
            <span className="sr-only">{event_where({}, options)} </span>
            <span className="min-w-0 break-words" dir="auto">
              {locationParts.map((part, index) => (
                <span key={`${part}-${index}`}>
                  {index > 0 ? ' · ' : null}
                  <bdi>{part}</bdi>
                </span>
              ))}
            </span>
          </span>
        ) : null}
        {isCancelled ? null : (
          <ShareEventButton
            locale={locale}
            eventId={event.id}
            title={event.title}
            label={share_event_action({}, options)}
          />
        )}
      </div>
    </header>
  );
};
