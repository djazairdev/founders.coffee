import { and, asc, eq, notExists, sql } from 'drizzle-orm';

import type {
  EventOrganiserRole,
  OrganisationKind,
  OrganisationStatus,
} from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { auditStatement, type AuditEntry } from './operations-audit.js';
import { eventOrganisers, events, organization, type Event } from './schema.js';

export type CoHostEvent = Pick<
  Event,
  'id' | 'title' | 'slug' | 'marketCode' | 'status' | 'kind' | 'startsAt'
>;

export type EventOrganiserRow = {
  readonly organisationId: string;
  readonly name: string;
  readonly slug: string;
  readonly kind: OrganisationKind;
  readonly status: OrganisationStatus;
  readonly role: EventOrganiserRole;
};

export type CoHostCandidate = {
  readonly organisationId: string;
  readonly name: string;
  readonly slug: string;
  readonly kind: OrganisationKind;
};

export type CoHostChange = {
  readonly eventId: string;
  readonly organisationId: string;
  readonly audit: Omit<
    AuditEntry,
    'action' | 'targetType' | 'targetId' | 'reasonCode' | 'metadata'
  >;
};

const eventColumns = {
  id: events.id,
  title: events.title,
  slug: events.slug,
  marketCode: events.marketCode,
  status: events.status,
  kind: events.kind,
  startsAt: events.startsAt,
};

/** One event as an operator sees it before changing its co-hosts, found by its id. */
export const readCoHostEventById = async (
  db: Db,
  eventId: string,
): Promise<CoHostEvent | null> => {
  const [row] = await db
    .select(eventColumns)
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return row ?? null;
};

/** One event as an operator sees it before changing its co-hosts, found by its address. */
export const readCoHostEventByAddress = async (
  db: Db,
  input: { readonly marketCode: string; readonly slug: string },
): Promise<CoHostEvent | null> => {
  const [row] = await db
    .select(eventColumns)
    .from(events)
    .where(
      and(eq(events.marketCode, input.marketCode), eq(events.slug, input.slug)),
    )
    .limit(1);
  return row ?? null;
};

/**
 * Every organisation an event names, whatever its status, the lead first, and the approved
 * organisations of the event's market it could still name as a co-host, by name (B-EVT-20).
 */
export const listEventCoHostChoices = async (
  db: Db,
  event: Pick<CoHostEvent, 'id' | 'marketCode'>,
) => {
  const [organisers, candidates] = await db.batch([
    db
      .select({
        organisationId: organization.id,
        name: organization.name,
        slug: organization.slug,
        kind: organization.kind,
        status: organization.status,
        role: eventOrganisers.role,
      })
      .from(eventOrganisers)
      .innerJoin(
        organization,
        eq(organization.id, eventOrganisers.organisationId),
      )
      .where(eq(eventOrganisers.eventId, event.id))
      .orderBy(
        sql`${eventOrganisers.role} = 'lead' DESC`,
        asc(organization.name),
      ),
    db
      .select({
        organisationId: organization.id,
        name: organization.name,
        slug: organization.slug,
        kind: organization.kind,
      })
      .from(organization)
      .where(
        and(
          eq(organization.marketCode, event.marketCode),
          eq(organization.status, 'approved'),
          notExists(
            db
              .select({ id: eventOrganisers.organisationId })
              .from(eventOrganisers)
              .where(
                and(
                  eq(eventOrganisers.eventId, event.id),
                  eq(eventOrganisers.organisationId, organization.id),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(organization.name)),
  ]);
  return {
    organisers: organisers as EventOrganiserRow[],
    candidates: candidates as CoHostCandidate[],
  };
};

/**
 * Name an approved organisation of the event's own market as one of its co-hosts, with the audit
 * entry, in one batch. The row is selected from the event and the organisation, so a missing event,
 * an organisation that is not approved or belongs to another market, or one already named writes
 * nothing, and the audit entry, which follows only a row just written (`changes() = 1`), neither.
 */
export const addEventCoHost = async (
  db: Db,
  change: CoHostChange,
): Promise<boolean> => {
  const [inserted] = await batch(db, [
    db
      .insert(eventOrganisers)
      .select(
        db
          .select({
            eventId: events.id,
            organisationId: organization.id,
            role: sql<EventOrganiserRole>`'co_host'`.as('role'),
            createdAt: sql`unixepoch()`.as('created_at'),
          })
          .from(events)
          .innerJoin(
            organization,
            and(
              eq(organization.id, change.organisationId),
              eq(organization.marketCode, events.marketCode),
              eq(organization.status, 'approved'),
            ),
          )
          .where(eq(events.id, change.eventId)),
      )
      .onConflictDoNothing(),
    auditStatement(
      db,
      {
        ...change.audit,
        action: 'co_host_added',
        targetType: 'event',
        targetId: change.eventId,
        reasonCode: null,
        metadata: { organisationId: change.organisationId },
      },
      events,
      events.marketCode,
      and(eq(events.id, change.eventId), sql`changes() = 1`),
    ),
  ]);
  return ((inserted as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0;
};

/**
 * Take a co-host off an event, with the audit entry, in one batch. Only a `co_host` row goes, so the
 * organisation that leads the event stays, and the audit entry follows only a row just removed.
 */
export const removeEventCoHost = async (
  db: Db,
  change: CoHostChange,
): Promise<boolean> => {
  const [deleted] = await batch(db, [
    db
      .delete(eventOrganisers)
      .where(
        and(
          eq(eventOrganisers.eventId, change.eventId),
          eq(eventOrganisers.organisationId, change.organisationId),
          eq(eventOrganisers.role, 'co_host'),
        ),
      ),
    auditStatement(
      db,
      {
        ...change.audit,
        action: 'co_host_removed',
        targetType: 'event',
        targetId: change.eventId,
        reasonCode: null,
        metadata: { organisationId: change.organisationId },
      },
      events,
      events.marketCode,
      and(eq(events.id, change.eventId), sql`changes() = 1`),
    ),
  ]);
  return ((deleted as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0;
};
