import { and, eq, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import { eventOrganisers, events, member } from './schema.js';

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

/**
 * Whether this person belongs to an organisation that organises this event, as its lead or a
 * co-host. Every role in an organisation organises, so membership is enough.
 */
export const isEventOrganiser = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<boolean> => {
  const [row] = await db
    .select({ organisationId: eventOrganisers.organisationId })
    .from(eventOrganisers)
    .innerJoin(
      member,
      eq(member.organizationId, eventOrganisers.organisationId),
    )
    .where(
      and(
        eq(eventOrganisers.eventId, input.eventId),
        eq(member.userId, input.userId),
      ),
    )
    .limit(1);
  return row !== undefined;
};
