import { id } from '@founders-coffee/core';

import { batch } from './atomic.js';
import { insertChatChannel } from './chat-channels.js';
import type { Db } from './db.js';
import { insertLeadOrganiser } from './event-organisers.js';
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
