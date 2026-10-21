import { geo } from '@founders-coffee/domain';
import type { Db, Event } from '@founders-coffee/db';

import { attachAttendance, type EventDetailItem } from './attendance.js';
import { meetingLinkFor } from './meeting-link.js';

/**
 * A resolved meetup as its page shows it: how many are going, whether the reader is one of them,
 * and its city and state named in each of the page's languages. The names come from the geo data
 * here on the server, which is never bundled to the client. The meeting link is the reader's own,
 * `null` unless `meetingLinkFor` gives it to them (B-EVT-11).
 */
export const eventDetail = async (
  db: Db,
  event: Event,
  viewerId?: string | null,
): Promise<EventDetailItem> => {
  const [enriched] = await attachAttendance(db, [event], viewerId);
  const meetingLink = await meetingLinkFor(db, event, {
    id: viewerId,
    isGoing: enriched?.viewerRsvp === 'going',
  });
  const city = geo.findCity(event.marketCode, event.cityCode);
  const state = geo.findState(event.marketCode, event.stateCode);
  return {
    ...enriched,
    meetingLink,
    cityName: city?.name ?? event.cityCode,
    cityNameAr: city?.nameAr ?? city?.name ?? event.cityCode,
    cityNameFr: city?.nameFr ?? city?.name ?? event.cityCode,
    citySlug: city?.slug ?? null,
    stateName: state?.name ?? null,
    stateNameAr: state?.nameAr ?? state?.name ?? null,
    stateNameFr: state?.nameFr ?? state?.name ?? null,
  };
};
