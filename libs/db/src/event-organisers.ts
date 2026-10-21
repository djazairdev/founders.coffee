import { eq, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import { eventOrganisers, events } from './schema.js';

/**
 * Name an organisation as the lead of an event, selected from the event's own row, so it is written
 * only when that event was: in the event's batch, an address that was taken writes neither.
 */
export const insertLeadOrganiser = (
  db: Db,
  input: { readonly eventId: string; readonly organisationId: string },
) =>
  db.insert(eventOrganisers).select(
    db
      .select({
        eventId: events.id,
        organisationId: sql<string>`${input.organisationId}`.as(
          'organisation_id',
        ),
        role: sql<'lead'>`'lead'`.as('role'),
        createdAt: sql`unixepoch()`.as('created_at'),
      })
      .from(events)
      .where(eq(events.id, input.eventId)),
  );
