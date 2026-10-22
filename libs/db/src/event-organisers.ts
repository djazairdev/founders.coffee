import { and, asc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import type { Db } from './db.js';
import { eventOrganisers, events, member, organization } from './schema.js';

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

/**
 * The approved organisations that organise the events matching `which`, each with its kind and
 * role, ordered by event and then by name. A pending, rejected or suspended organisation is left
 * out, so an event is never shown as run by one the platform does not stand behind.
 */
const eventOrganisationsWhere = (db: Db, which: SQL) =>
  db
    .select({
      eventId: eventOrganisers.eventId,
      name: organization.name,
      slug: organization.slug,
      kind: organization.kind,
      role: eventOrganisers.role,
    })
    .from(eventOrganisers)
    .innerJoin(
      organization,
      eq(organization.id, eventOrganisers.organisationId),
    )
    .where(and(which, eq(organization.status, 'approved')))
    .orderBy(asc(eventOrganisers.eventId), asc(organization.name));

/**
 * The organisations of one event, named by an id or by a subquery that yields one, so that a page
 * can read them in the same batch as the event itself (B-EVT-19).
 */
export const eventOrganisationsQuery = (db: Db, eventId: SQL | string) =>
  eventOrganisationsWhere(db, eq(eventOrganisers.eventId, eventId));

/** The organisations of each of these events, in one read; an empty list reads nothing. */
export const listEventOrganisations = async (
  db: Db,
  eventIds: readonly string[],
) => {
  const ids = [...new Set(eventIds)];
  if (ids.length === 0) return [];
  return eventOrganisationsWhere(db, inArray(eventOrganisers.eventId, ids));
};
