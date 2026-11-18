import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  eq,
  eventOrganisers,
  events,
  organization,
  type Db,
} from '@founders-coffee/db';
import {
  setLogger,
  type LogEntry,
  type Metrics,
} from '@founders-coffee/observability';
import { createServerLogger } from '@founders-coffee/observability/server';

import { createEventWithTelemetry, EVENTS_CREATED_METRIC } from './create.js';
import {
  rawCreateInput,
  createInput,
  setupDb,
  testMapProvider,
  TEST_HOST_ID,
} from './resolver.fixtures.js';
import { organisationEventCreateRequestSchema } from './schemas.js';

const entries: LogEntry[] = [];

const organisersOf = (db: Db, eventId: string) =>
  db
    .select({
      organisationId: eventOrganisers.organisationId,
      role: eventOrganisers.role,
    })
    .from(eventOrganisers)
    .where(eq(eventOrganisers.eventId, eventId));

const approvedOrganisation = async (
  db: Db,
  organisationId: string,
  marketCode = 'DZ',
) => {
  await db
    .insert(organization)
    .values({
      id: organisationId,
      name: 'Code Club Alger',
      slug: organisationId,
      kind: 'club',
      status: 'approved',
      marketCode,
      description: 'Weekly coding evenings for students in Algiers.',
    })
    .onConflictDoNothing();
};

describe('creating an event as an organisation (B-EVT-17, real D1)', () => {
  beforeEach(() => {
    entries.length = 0;
    setLogger(
      createServerLogger({
        level: 'debug',
        transport: (entry) => {
          entries.push(entry);
        },
      }),
    );
  });

  it('names the organisation as lead, logs its id, and counts the event as any other', async () => {
    const db = await setupDb();
    await approvedOrganisation(db, 'org_as_lead');
    const trackEvent = vi.fn();
    const metrics: Metrics = { trackEvent, trackCount: vi.fn() };

    const result = await createEventWithTelemetry(
      db,
      testMapProvider,
      metrics,
      TEST_HOST_ID,
      createInput({ title: 'Code Club evening' }),
      undefined,
      'org_as_lead',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.hostId).toBe(TEST_HOST_ID);
    expect(await organisersOf(db, result.data.id)).toEqual([
      { organisationId: 'org_as_lead', role: 'lead' },
    ]);
    for (const msg of ['event_create_requested', 'event_create_succeeded']) {
      expect(entries.find((entry) => entry.msg === msg)).toMatchObject({
        leadOrganisationId: 'org_as_lead',
      });
    }
    expect(trackEvent).toHaveBeenCalledOnce();
    expect(trackEvent).toHaveBeenCalledWith(
      EVENTS_CREATED_METRIC,
      expect.objectContaining({ market: 'DZ', locale: 'fr' }),
    );
  });

  it('refuses an organisation from another market, and writes nothing', async () => {
    const db = await setupDb();
    await approvedOrganisation(db, 'org_cairo', 'EG');
    const before = await db.select({ id: events.id }).from(events);

    const result = await createEventWithTelemetry(
      db,
      testMapProvider,
      null,
      TEST_HOST_ID,
      createInput({ title: 'Cairo club in Algiers' }),
      undefined,
      'org_cairo',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('forbidden');
    expect(await db.select({ id: events.id }).from(events)).toEqual(before);
    expect(
      await db
        .select()
        .from(eventOrganisers)
        .where(eq(eventOrganisers.organisationId, 'org_cairo')),
    ).toEqual([]);
  });

  it('creates a community event, with no organiser, when none is named', async () => {
    const db = await setupDb();

    const result = await createEventWithTelemetry(
      db,
      testMapProvider,
      null,
      TEST_HOST_ID,
      createInput({ title: 'Community evening' }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(await organisersOf(db, result.data.id)).toEqual([]);
    expect(
      entries.find((entry) => entry.msg === 'event_create_succeeded'),
    ).toMatchObject({ leadOrganisationId: null });
  });

  it('takes an organisation and an event, and nothing else', () => {
    const event = rawCreateInput();

    expect(
      organisationEventCreateRequestSchema.safeParse({
        organisationId: 'org_as_lead',
        event,
      }).success,
    ).toBe(true);
    expect(
      organisationEventCreateRequestSchema.safeParse({ event }).success,
    ).toBe(false);
    expect(
      organisationEventCreateRequestSchema.safeParse({
        organisationId: '',
        event,
      }).success,
    ).toBe(false);
    expect(
      organisationEventCreateRequestSchema.safeParse({
        organisationId: 'org_as_lead',
        event,
        attribution: { source: 'facebook' },
      }).success,
    ).toBe(false);
  });
});
