import { id } from '@founders-coffee/core';

import { batch } from './atomic.js';
import { insertChatChannel } from './chat-channels.js';
import type { Db } from './db.js';
import { insertLeadOrganiser } from './event-organisers.js';
import { insertHackathonDetails, type HackathonDetails } from './hackathons.js';
import { events, type Event, type NewEvent } from './schema.js';

/**
 * Publish a meetup, with its chat, only when its address is free in its market.
 *
 * One batch: the meetup's insert gives way on a taken address, and the chat's insert selects from
 * the meetup's row, so an address that was taken writes neither and a published meetup always has
 * its chat (P1-026). An event created as an organisation gets its lead row the same way (B-EVT-17).
 */
export const createEventIfRouteAvailable = async (
  db: Db,
  row: NewEvent,
  leadOrganisationId?: string,
): Promise<Event | undefined> => {
  const [created] = await batch(db, [
    db
      .insert(events)
      .values(row)
      .onConflictDoNothing({ target: [events.marketCode, events.slug] })
      .returning(),
    insertChatChannel(db, { id: id('chn'), eventId: row.id }),
    ...(leadOrganisationId
      ? [
          insertLeadOrganiser(db, {
            eventId: row.id,
            organisationId: leadOrganisationId,
          }),
        ]
      : []),
  ]);
  return (created as Event[])[0];
};

/**
 * Write a hackathon's draft (B-HKN-06) when its address is free in its market: its event, chat, lead
 * organisation and details in one batch. The chat, the lead and the details each select from the
 * event's row, so an address that was taken writes none of them, and the details are written only
 * beside an event of kind `hackathon`. The event is a `draft`, so no reader sees it until it is
 * published, and the details start their review as a `draft` too.
 */
export const createHackathonDraftIfRouteAvailable = async (
  db: Db,
  row: NewEvent,
  leadOrganisationId: string,
  details: HackathonDetails,
): Promise<Event | undefined> => {
  const [created] = await batch(db, [
    db
      .insert(events)
      .values(row)
      .onConflictDoNothing({ target: [events.marketCode, events.slug] })
      .returning(),
    insertChatChannel(db, { id: id('chn'), eventId: row.id }),
    insertLeadOrganiser(db, {
      eventId: row.id,
      organisationId: leadOrganisationId,
    }),
    insertHackathonDetails(db, { eventId: row.id, details }),
  ]);
  return (created as Event[])[0];
};
