import {
  events as eventsDomain,
  geo,
  type EventOrganiserSummary,
} from '@founders-coffee/domain';
import type { Db, Event } from '@founders-coffee/db';

import { attachAttendance, type EventDetailItem } from './attendance.js';
import { readEventOrganisers } from './feed.js';
import { meetingLinkFor } from './meeting-link.js';

/**
 * A resolved meetup as its page shows it: how many are going, whether the reader is one of them,
 * and its city and state named in each of the page's languages. The names come from the geo data
 * here on the server, which is never bundled to the client. The meeting link is the reader's own,
 * `null` unless `meetingLinkFor` gives it to them (B-EVT-11). Who runs it comes from its
 * organisations (B-EVT-19), read here unless the caller already has them.
 */
export const eventDetail = async (
  db: Db,
  event: Event,
  viewerId?: string | null,
  organisers?: readonly EventOrganiserSummary[],
): Promise<EventDetailItem> => {
  const [[enriched], organisersById] = await Promise.all([
    attachAttendance(db, [event], viewerId),
    organisers ? null : readEventOrganisers(db, [event.id]),
  ]);
  const meetingLink = await meetingLinkFor(db, event, {
    id: viewerId,
    isGoing: enriched?.viewerRsvp === 'going',
  });
  const city = event.cityCode
    ? geo.findCity(event.marketCode, event.cityCode)
    : null;
  const state = event.stateCode
    ? geo.findState(event.marketCode, event.stateCode)
    : null;
  return {
    ...enriched,
    meetingLink,
    runBy: eventsDomain.eventRunBy(
      organisers ?? organisersById?.get(event.id) ?? [],
    ),
    cityName: city?.name ?? null,
    cityNameAr: city?.nameAr ?? city?.name ?? null,
    cityNameFr: city?.nameFr ?? city?.name ?? null,
    citySlug: city?.slug ?? null,
    stateName: state?.name ?? null,
    stateNameAr: state?.nameAr ?? state?.name ?? null,
    stateNameFr: state?.nameFr ?? state?.name ?? null,
  };
};
