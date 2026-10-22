import { MapPin, Video } from 'lucide-react';

import {
  event_meeting_join,
  event_meeting_link_members,
  event_where,
  type Locale,
} from '@founders-coffee/i18n';
import type { EventDetailItem } from '@founders-coffee/server-fns';

import { eventFormatName } from '../../features/events/event-format-name';

export const EventWhere = ({
  locale,
  event,
  place,
  isCancelled,
}: {
  locale: Locale;
  event: EventDetailItem;
  place: string;
  isCancelled: boolean;
}) => {
  const formatName = eventFormatName(event.format, locale);
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      <dt className="eyebrow">{event_where({}, { locale })}</dt>
      {event.venue !== null ? (
        <dd className="mt-1.5 flex items-start gap-2 font-medium">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-secondary"
            aria-hidden="true"
          />
          <span>
            <bdi>{event.venue}</bdi>
          </span>
        </dd>
      ) : formatName ? (
        <dd className="mt-1.5 flex items-start gap-2 font-medium">
          <Video
            className="mt-0.5 size-4 shrink-0 text-secondary"
            aria-hidden="true"
          />
          <span>{formatName}</span>
        </dd>
      ) : null}
      <dd className="mt-0.5 ps-6 text-body-sm text-neutral">
        <bdi>{place}</bdi>
      </dd>
      {event.meetingLink ? (
        <dd className="mt-3 flex items-start gap-2">
          <Video
            className="mt-0.5 size-4 shrink-0 text-secondary"
            aria-hidden="true"
          />
          <span className="flex min-w-0 flex-col">
            <a
              className="link link-secondary font-medium"
              href={event.meetingLink}
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              target="_blank"
            >
              {event_meeting_join({}, { locale })}
            </a>
            <span className="break-all text-body-sm text-neutral" dir="ltr">
              {event.meetingLink}
            </span>
          </span>
        </dd>
      ) : event.format !== 'in_person' && !isCancelled ? (
        <dd className="mt-3 flex items-start gap-2 text-body-sm text-neutral">
          <Video
            className="mt-0.5 size-4 shrink-0 text-secondary"
            aria-hidden="true"
          />
          <span>{event_meeting_link_members({}, { locale })}</span>
        </dd>
      ) : null}
    </div>
  );
};
