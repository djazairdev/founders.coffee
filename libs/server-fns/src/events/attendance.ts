import type { EventRunBy } from '@founders-coffee/domain';
import type { Db } from '@founders-coffee/db';
import {
  countRegisteredHackathonParticipants,
  getRsvpsForEvents,
} from '@founders-coffee/db';

import { publicEvent, type PublicEvent } from './public-event.js';

export interface EventAttendance {
  readonly goingCount: number;
  readonly viewerRsvp: 'going' | null;
}

export type EventWithAttendance = PublicEvent & EventAttendance;

export type EventDetailItem = EventWithAttendance & {
  readonly meetingLink: string | null;
  readonly runBy: EventRunBy;
  readonly cityName: string | null;
  readonly cityNameAr: string | null;
  readonly cityNameFr: string | null;
  readonly citySlug: string | null;
  readonly stateName: string | null;
  readonly stateNameAr: string | null;
  readonly stateNameFr: string | null;
};

/**
 * Attach attendance fields to a list of events. No N+1 — uses one grouped registration count for
 * hackathons, the denormalized `events.rsvps` counter for other events, and one batched viewer query.
 *
 * Hackathon counts include confirmed registrations only. Other event counts use `event.rsvps`.
 * Hackathons do not use generic RSVP state.
 */
export const attachAttendance = async <
  T extends PublicEvent & { readonly meetingUrl?: string | null },
>(
  db: Db,
  events: readonly T[],
  viewerId?: string | null,
): Promise<(Omit<T, 'meetingUrl'> & EventAttendance)[]> => {
  const regularEventIds = events
    .filter((event) => event.kind !== 'hackathon')
    .map((event) => event.id);
  const hackathonIds = events
    .filter((event) => event.kind === 'hackathon')
    .map((event) => event.id);
  const [viewerRsvps, hackathonCounts] = await Promise.all([
    viewerId && regularEventIds.length > 0
      ? getRsvpsForEvents(db, { eventIds: regularEventIds, userId: viewerId })
      : Promise.resolve(new Map<string, 'going' | 'waitlist' | 'cancelled'>()),
    hackathonIds.length > 0
      ? countRegisteredHackathonParticipants(db, hackathonIds)
      : Promise.resolve(new Map<string, number>()),
  ]);

  return events.map((event) => ({
    ...publicEvent(event),
    goingCount:
      event.kind === 'hackathon'
        ? (hackathonCounts.get(event.id) ?? 0)
        : event.rsvps,
    viewerRsvp:
      event.kind === 'hackathon'
        ? null
        : viewerRsvps.get(event.id) === 'going'
          ? 'going'
          : null,
  }));
};
