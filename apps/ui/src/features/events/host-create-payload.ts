import type { EventFormat } from '@founders-coffee/core';
import { events } from '@founders-coffee/domain';

import type { HostCreateDraft } from './host-create-draft';
import type { MeetupLanguage, VenueSelection } from './types';
import type { EventCreateCommand } from './useHostPublish';

type EventPlace = {
  readonly format: EventFormat;
  readonly venue: VenueSelection | null;
  readonly venueName: string;
  readonly meetingUrl: string;
};

export type EventPlaceFields = Pick<
  EventCreateCommand,
  | 'format'
  | 'venueName'
  | 'venueProviderId'
  | 'venueAddress'
  | 'latitude'
  | 'longitude'
  | 'meetingUrl'
>;

/**
 * Where a new event happens, carrying only what its format has (B-EVT-10): the venue for an
 * in-person one, the link for an online one, both for a hybrid one. A field a format does not have
 * is left out rather than sent empty, because the server refuses an online event that names a
 * venue. `null` while the place still lacks what its format needs, an online event's city included.
 */
export const eventPlaceFields = (
  place: EventPlace,
  cityCode: string | undefined,
): EventPlaceFields | null => {
  const { venue, format } = place;
  const hasVenue = events.hasVenue(format);
  if (hasVenue && !venue) return null;
  if (format === 'online' && !cityCode) return null;
  const meetingUrl = place.meetingUrl.trim();
  if (events.hasMeetingLink(format) && !meetingUrl) return null;
  return {
    format,
    ...(hasVenue && venue
      ? {
          venueName: place.venueName,
          venueProviderId: venue.providerId,
          venueAddress: venue.address,
          latitude: venue.latitude,
          longitude: venue.longitude,
        }
      : {}),
    ...(events.hasMeetingLink(format) ? { meetingUrl } : {}),
  };
};

/** The event to create from a finished draft, or `null` while it still lacks its time or place. */
export const hostCreatePayload = (
  draft: HostCreateDraft,
  where: {
    readonly marketCode: string;
    readonly cityCode: string | undefined;
    readonly languages: readonly MeetupLanguage[];
  },
): EventCreateCommand | null => {
  const { startsAt, endsAt } = draft;
  if (startsAt === null || endsAt === null) return null;
  const place = eventPlaceFields(draft, where.cityCode);
  if (!place) return null;
  return {
    marketCode: where.marketCode,
    cityCode: where.cityCode,
    title: draft.title,
    description: draft.description,
    languages: [...where.languages],
    startsAt,
    endsAt,
    kind: draft.kind,
    tags: [...draft.tags],
    ...place,
  };
};
