import type { ReactNode } from 'react';
import {
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { eventLanguages, textLanguage } from '@founders-coffee/core';
import {
  event_format_hybrid,
  event_format_in_person,
  event_format_online,
  event_when,
  formatNumber,
  hackathon_details_registration_closes,
  hackathon_details_minimum_age,
  hackathon_details_team_hint,
  hackathon_format_label,
  hackathon_meta_format_location,
  hackathon_meta_minimum_age_value,
  hackathon_meta_schedule,
  hackathon_meta_team_size,
  hackathon_team_size,
  share_event_action,
  type Locale,
} from '@founders-coffee/i18n';
import type { Market } from '@founders-coffee/db';
import type { EventDetailItem } from '@founders-coffee/server-fns';

import { eventCityName } from '../../events/event-city-name';
import { eventStreetAddress } from '../../events/event-street-address';
import { EventCoHosts } from '../../../components/events/EventCoHosts';
import { ShareEventButton } from '../../../components/events/ShareEventButton';
import { eventShortDateLabel } from '../../../components/events/event-time';
import type { HackathonRegistrationView, HackathonSchedule } from '../api';
import type { HackathonApplicationQuestion } from '../application-answers';
import { HackathonRegistrationAction } from './HackathonRegistrationAction';

const MetaItem = ({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) => (
  <div className="flex min-w-0 items-start gap-3">
    <Icon className="mt-1 size-5 shrink-0 text-secondary" aria-hidden="true" />
    <div className="min-w-0">
      <dt className="text-body-sm text-neutral">{label}</dt>
      <dd className="mt-1 break-words text-body-md font-medium" dir="auto">
        {children}
      </dd>
    </div>
  </div>
);

export const HackathonPublicHero = ({
  event,
  schedule,
  registration,
  minimumAge,
  teamSize,
  market,
  locale,
  isCancelled,
  organisations,
  applicationQuestions,
}: {
  event: EventDetailItem;
  schedule: HackathonSchedule | null;
  registration: HackathonRegistrationView | null;
  minimumAge: number | null;
  teamSize: { readonly min: number; readonly max: number } | null;
  market: Market;
  locale: Locale;
  isCancelled: boolean;
  organisations?: readonly { readonly name: string; readonly slug: string }[];
  applicationQuestions: readonly HackathonApplicationQuestion[];
}) => {
  const options = { locale };
  const cityName = eventCityName(event, locale);
  const streetAddress = eventStreetAddress(event);
  const languages = eventLanguages(event);
  const start = new Date(event.startsAt);
  const submissionDeadline = new Date(
    schedule?.submissionDeadlineAt ?? event.endsAt ?? event.startsAt,
  );
  const registrationCloses = schedule
    ? new Date(schedule.registrationClosesAt)
    : null;
  const locationParts = (
    event.format === 'online' ? [] : [event.venue, streetAddress, cityName]
  )
    .filter((part): part is string => part !== null)
    .filter((part, index, parts) => parts.indexOf(part) === index);
  const formatLabel =
    event.format === 'online'
      ? event_format_online({}, options)
      : event.format === 'hybrid'
        ? event_format_hybrid({}, options)
        : event_format_in_person({}, options);
  const teamSizeLabel =
    teamSize === null
      ? null
      : teamSize.min === 1
        ? hackathon_details_team_hint(
            { max: formatNumber(teamSize.max, locale) },
            options,
          )
        : hackathon_team_size(
            {
              min: formatNumber(teamSize.min, locale),
              max: formatNumber(teamSize.max, locale),
            },
            options,
          );

  return (
    <header className="rounded-box bg-base-200 p-5 sm:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <h1 className="min-w-0 flex-1 break-words font-display text-h3 font-semibold text-balance md:text-h2">
          <bdi dir="auto" lang={textLanguage(event.title, languages)}>
            {event.title}
          </bdi>
        </h1>
        {!isCancelled && schedule && registration ? (
          <HackathonRegistrationAction
            eventId={event.id}
            format={event.format}
            minimumAge={minimumAge}
            schedule={schedule}
            registration={registration}
            timeZone={market.timezone}
            locale={locale}
            applicationQuestions={applicationQuestions}
          />
        ) : null}
      </div>
      <EventCoHosts
        runBy={event.runBy}
        locale={locale}
        isLinked
        className="mt-3"
        organisations={organisations?.length ? organisations : undefined}
      />
      <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <MetaItem
          icon={CalendarDays}
          label={
            schedule
              ? hackathon_meta_schedule({}, options)
              : event_when({}, options)
          }
        >
          <time dateTime={start.toISOString()}>
            <bdi>{eventShortDateLabel(start, locale, market.timezone)}</bdi>
          </time>
          {' – '}
          <time dateTime={submissionDeadline.toISOString()}>
            <bdi>
              {eventShortDateLabel(submissionDeadline, locale, market.timezone)}
            </bdi>
          </time>
        </MetaItem>
        {registrationCloses ? (
          <MetaItem
            icon={Clock3}
            label={hackathon_details_registration_closes({}, options)}
          >
            <time dateTime={registrationCloses.toISOString()}>
              <bdi>
                {eventShortDateLabel(
                  registrationCloses,
                  locale,
                  market.timezone,
                )}
              </bdi>
            </time>
          </MetaItem>
        ) : null}
        <MetaItem
          icon={MapPin}
          label={
            locationParts.length > 0
              ? hackathon_meta_format_location({}, options)
              : hackathon_format_label({}, options)
          }
        >
          <bdi>{formatLabel}</bdi>
          {locationParts.map((part) => (
            <span key={part}>
              {' · '}
              <bdi>{part}</bdi>
            </span>
          ))}
        </MetaItem>
        {teamSizeLabel ? (
          <MetaItem icon={Users} label={hackathon_meta_team_size({}, options)}>
            {teamSizeLabel}
          </MetaItem>
        ) : null}
        {minimumAge !== null ? (
          <MetaItem
            icon={ShieldCheck}
            label={hackathon_details_minimum_age({}, options)}
          >
            {hackathon_meta_minimum_age_value(
              { age: formatNumber(minimumAge, locale) },
              options,
            )}
          </MetaItem>
        ) : null}
      </dl>
      {isCancelled ? null : (
        <div className="mt-5">
          <ShareEventButton
            locale={locale}
            eventId={event.id}
            title={event.title}
            label={share_event_action({}, options)}
          />
        </div>
      )}
    </header>
  );
};
