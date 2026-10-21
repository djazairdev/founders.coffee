import type { EventRunBy } from '@founders-coffee/domain';
import type { Db } from '@founders-coffee/db';
import { getRsvpsForEvents } from '@founders-coffee/db';

import { publicEvent, type PublicEvent } from './public-event.js';

export interface EventAttendance {
  readonly goingCount: number;
  readonly viewerRsvp: 'going' | null;
}

export type EventWithAttendance = PublicEvent & EventAttendance;

export type EventDetailItem = EventWithAttendance & {
  readonly meetingLink: string | null;
  readonly runBy: EventRunBy;
  readonly cityName: string;
  readonly cityNameAr: string;
  readonly cityNameFr: string;
  readonly citySlug: string | null;
  readonly stateName: string | null;
  readonly stateNameAr: string | null;
  readonly stateNameFr: string | null;
};

/**
 * Attach attendance fields to a list of events. No N+1 — uses the denormalized
 * `events.rsvps` counter for `goingCount` and a single batched query for `viewerRsvp`.
 *
 * `goingCount` = `event.rsvps` (free — already on the row).
 * `viewerRsvp` = one grouped query for all events, mapped back.
 */
export const attachAttendance = async <
  T extends PublicEvent & { readonly meetingUrl?: string | null },
>(
  db: Db,
  events: readonly T[],
  viewerId?: string | null,
): Promise<(Omit<T, 'meetingUrl'> & EventAttendance)[]> => {
  const eventIds = events.map((e) => e.id);

  const viewerRsvps = viewerId
    ? await getRsvpsForEvents(db, { eventIds, userId: viewerId })
    : new Map<string, 'going' | 'waitlist' | 'cancelled'>();

  return events.map((event) => ({
    ...publicEvent(event),
    goingCount: event.rsvps,
    viewerRsvp: viewerRsvps.get(event.id) === 'going' ? 'going' : null,
  }));
};
