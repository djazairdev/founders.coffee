import {
  events as eventsDomain,
  geo,
  profile,
  type EventOrganiserSummary,
  type EventRunBy,
} from '@founders-coffee/domain';
import {
  listEventOrganisations,
  type Db,
  type Event,
  type PublicEventHost,
} from '@founders-coffee/db';

import type { EventAttendance } from './attendance.js';
import { publicEvent, type PublicEvent } from './public-event.js';

export type EventFeedItemBase = PublicEvent & {
  readonly cityName: string;
  readonly cityNameAr: string;
  readonly cityNameFr: string;
  readonly citySlug: string | null;
  readonly hostName: string | null;
  readonly hostPhotoAssetId: string | null;
  readonly runBy: EventRunBy;
};

export type EventFeedItem = EventFeedItemBase & Partial<EventAttendance>;

export type EventOrganisersById = ReadonlyMap<
  string,
  readonly EventOrganiserSummary[]
>;

/** The organisations of each of these events, keyed by event id, in one read (B-EVT-19). */
export const readEventOrganisers = async (
  db: Db,
  eventIds: readonly string[],
): Promise<EventOrganisersById> => {
  const byEvent = new Map<string, EventOrganiserSummary[]>();
  for (const { eventId, ...organiser } of await listEventOrganisations(
    db,
    eventIds,
  )) {
    byEvent.set(eventId, [...(byEvent.get(eventId) ?? []), organiser]);
  }
  return byEvent;
};

export const attachCityNames = (
  rows: readonly Event[],
  hosts = new Map<string, PublicEventHost>(),
  organisers: EventOrganisersById = new Map(),
): EventFeedItemBase[] =>
  rows.map((event) => {
    const city = geo.findCity(event.marketCode, event.cityCode);
    const host = hosts.get(event.hostId);
    return {
      ...publicEvent(event),
      cityName: city?.name ?? event.cityCode,
      cityNameAr: city?.nameAr ?? city?.name ?? event.cityCode,
      cityNameFr: city?.nameFr ?? city?.name ?? event.cityCode,
      citySlug: city?.slug ?? null,
      hostName: host ? profile.safeProfileDisplayName(host.name) || null : null,
      hostPhotoAssetId: host?.photoAssetId ?? null,
      runBy: eventsDomain.eventRunBy(organisers.get(event.id) ?? []),
    };
  });
