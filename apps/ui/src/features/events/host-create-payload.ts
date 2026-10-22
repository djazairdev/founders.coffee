import { events } from '@founders-coffee/domain';

import type { HostCreateDraft } from './host-create-draft';
import type { MeetupLanguage } from './types';
import type { EventCreateCommand } from './useHostPublish';

/**
 * The event to create from a finished draft, carrying only what its format has (B-EVT-10): the
 * venue for an in-person meetup, the link and city for an online one, both for a hybrid one. A
 * field a format does not have is left out rather than sent empty, because the server refuses an
 * online event that names a venue. `null` while the draft still lacks what its format needs.
 */
export const hostCreatePayload = (
  draft: HostCreateDraft,
  where: {
    readonly marketCode: string;
    readonly cityCode: string | undefined;
    readonly languages: readonly MeetupLanguage[];
  },
): EventCreateCommand | null => {
  const { venue, startsAt, endsAt, format } = draft;
  if (startsAt === null || endsAt === null) return null;
  const hasVenue = events.hasVenue(format);
  if (hasVenue && !venue) return null;
  if (format === 'online' && !where.cityCode) return null;
  const meetingUrl = draft.meetingUrl.trim();
  if (events.hasMeetingLink(format) && !meetingUrl) return null;
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
    format,
    ...(hasVenue && venue
      ? {
          venueName: draft.venueName,
          venueProviderId: venue.providerId,
          venueAddress: venue.address,
          latitude: venue.latitude,
          longitude: venue.longitude,
        }
      : {}),
    ...(events.hasMeetingLink(format) ? { meetingUrl } : {}),
  };
};
