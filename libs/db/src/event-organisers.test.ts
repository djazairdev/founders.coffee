import { beforeAll, describe, expect, it } from 'vitest';

import { and, eq } from 'drizzle-orm';

import { baseEvent, setupDb } from './events.fixtures.js';
import { createEventIfRouteAvailable } from './events-publish.js';
import {
  chatChannels,
  eventOrganisers,
  events,
  organization,
} from './schema.js';
import type { Db } from './db.js';

let db: Db;
let sequence = 0;

const eventRow = (slug = `org-event-${++sequence}`) => ({
  ...baseEvent,
  id: `evt_org${String(++sequence).padStart(3, '0')}`,
  slug,
});

const addOrganisation = async (organisationId: string) => {
  await db.insert(organization).values({
    id: organisationId,
    name: `Club ${organisationId}`,
    slug: organisationId,
    kind: 'club',
    status: 'approved',
    marketCode: 'DZ',
    description: 'A club for the event organiser tests.',
  });
};

const organisersOf = (eventId: string) =>
  db
    .select({
      organisationId: eventOrganisers.organisationId,
      role: eventOrganisers.role,
    })
    .from(eventOrganisers)
    .where(eq(eventOrganisers.eventId, eventId));

describe('event organisers (B-EVT-17, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
    await addOrganisation('org_lead');
    await addOrganisation('org_co');
    await addOrganisation('org_gone');
  });

  it('names the organisation an event is created as its lead, in the event’s batch', async () => {
    const row = eventRow();
    const created = await createEventIfRouteAvailable(db, row, 'org_lead');

    expect(created?.id).toBe(row.id);
    expect(await organisersOf(row.id)).toEqual([
      { organisationId: 'org_lead', role: 'lead' },
    ]);
  });

  it('leaves a community event without organisers', async () => {
    const row = eventRow();
    await createEventIfRouteAvailable(db, row);

    expect(await organisersOf(row.id)).toEqual([]);
  });

  it('writes no lead row, like no event and no chat, when the address is taken', async () => {
    await createEventIfRouteAvailable(db, eventRow('taken-address'));
    const second = eventRow('taken-address');

    expect(
      await createEventIfRouteAvailable(db, second, 'org_lead'),
    ).toBeUndefined();
    expect(
      await db.select().from(events).where(eq(events.id, second.id)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(chatChannels)
        .where(eq(chatChannels.eventId, second.id)),
    ).toEqual([]);
    expect(await organisersOf(second.id)).toEqual([]);
  });

  it('allows one lead per event, beside any co-hosts', async () => {
    const row = eventRow();
    await createEventIfRouteAvailable(db, row, 'org_lead');

    await expect(
      db
        .insert(eventOrganisers)
        .values({ eventId: row.id, organisationId: 'org_co', role: 'lead' }),
    ).rejects.toThrow();
    await db
      .insert(eventOrganisers)
      .values({ eventId: row.id, organisationId: 'org_co', role: 'co_host' });

    expect(await organisersOf(row.id)).toHaveLength(2);
  });

  it('goes with its organisation, leaving the event, and with its event', async () => {
    const kept = eventRow();
    const removed = eventRow();
    await createEventIfRouteAvailable(db, kept, 'org_gone');
    await createEventIfRouteAvailable(db, removed, 'org_lead');

    await db.delete(organization).where(eq(organization.id, 'org_gone'));
    await db.delete(events).where(eq(events.id, removed.id));

    expect(await organisersOf(kept.id)).toEqual([]);
    expect(
      await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, kept.id)),
    ).toEqual([{ id: kept.id }]);
    expect(
      await db
        .select()
        .from(eventOrganisers)
        .where(
          and(
            eq(eventOrganisers.eventId, removed.id),
            eq(eventOrganisers.organisationId, 'org_lead'),
          ),
        ),
    ).toEqual([]);
  });
});
