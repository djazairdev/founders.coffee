import {
  eventShortPath,
  type CalendarTarget,
  type Locale,
} from '@founders-coffee/core';
import {
  getEvent,
  getEventCalendar,
  getRsvpsForEvents,
  type Db,
} from '@founders-coffee/db';
import { events } from '@founders-coffee/domain';

import { meetingLinkFor } from './meeting-link.js';

export type EventCalendarAnswer =
  | { readonly kind: 'file'; readonly body: string }
  | { readonly kind: 'redirect'; readonly location: string };

export type EventCalendarRequest = {
  readonly id: string;
  readonly locale: Locale;
  readonly target: CalendarTarget;
  readonly origin: string;
  readonly viewerId?: string | null;
};

/**
 * The meeting link this reader's entry carries, read only for a signed-in reader. The entry itself
 * is read through columns that are the same for everyone; the link is the one part that is theirs,
 * and the same rule as the page decides it.
 */
const readerMeetingLink = async (
  db: Db,
  id: string,
  viewerId: string | null | undefined,
): Promise<string | null> => {
  if (!viewerId) return null;
  const event = await getEvent(db, id);
  if (!event || event.meetingUrl === null) return null;
  const rsvps = await getRsvpsForEvents(db, {
    eventIds: [id],
    userId: viewerId,
  });
  return meetingLinkFor(db, event, {
    id: viewerId,
    isGoing: rsvps.get(id) === 'going',
  });
};

/**
 * How the calendar address answers for one meetup, or nothing when no meetup has the id.
 *
 * A published meetup answers as its `.ics` file, or as a redirect to Google Calendar's form filled
 * in. Either way the entry links back to the meetup's short address, in the language the entry was
 * asked for and on the origin that served it.
 *
 * A cancelled meetup answers with its own page instead, which says it is off and why. Nobody should
 * be handed a calendar entry for a gathering that is not happening, and the link that asked for one,
 * in a confirmation email sent before the host called it off, lands somewhere that explains.
 *
 * A draft answers as no meetup at all, so its address gives away nothing until it is published.
 *
 * The meeting link of an online or hybrid meetup goes only into the entry of a reader who may have
 * it, the host and the members going, as on the page; a download that carries no session gets an
 * entry without it.
 */
export const answerEventCalendar = async (
  db: Db,
  request: EventCalendarRequest,
): Promise<EventCalendarAnswer | null> => {
  const row = await getEventCalendar(db, request.id);
  if (!row || row.status === 'draft') return null;
  const page = `${request.origin}${eventShortPath(request.locale, request.id)}`;
  if (row.status !== 'published') return { kind: 'redirect', location: page };
  const entry = {
    ...row,
    id: request.id,
    url: page,
    meetingLink: await readerMeetingLink(db, request.id, request.viewerId),
  };
  return request.target === 'google'
    ? { kind: 'redirect', location: events.googleCalendarUrlFor(entry) }
    : { kind: 'file', body: events.icsFor(entry) };
};
