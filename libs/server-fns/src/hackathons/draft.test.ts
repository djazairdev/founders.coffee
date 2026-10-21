import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import {
  chatChannels,
  eq,
  eventOrganisers,
  eventRsvps,
  events,
  getHackathon,
  organization,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { setLogger, type LogEntry } from '@founders-coffee/observability';
import { createServerLogger } from '@founders-coffee/observability/server';

import {
  setupDb,
  testMapProvider,
  TEST_HOST_ID,
} from '../events/resolver.fixtures.js';
import { resolveMarketLanding } from '../markets/resolver.js';
import { createHackathonDraftResolver } from './draft.js';

const DAY = 86_400_000;
const entries: LogEntry[] = [];

const setHackathons = (db: Db, value: boolean) =>
  db.run(
    sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json(${value ? 'true' : 'false'})) WHERE code = 'DZ'`,
  );

const approvedOrganisation = (
  db: Db,
  organisationId: string,
  marketCode = 'DZ',
) =>
  db
    .insert(organization)
    .values({
      id: organisationId,
      name: 'Algiers Builders',
      slug: organisationId,
      kind: 'club',
      status: 'approved',
      marketCode,
      description: 'A club that runs hackathons for students in Algiers.',
    })
    .onConflictDoNothing();

const draft = (overrides: Record<string, unknown> = {}) => {
  const kickoff = Date.now() + 30 * DAY;
  return hackathons.hackathonDraftSchema.parse({
    marketCode: 'DZ',
    cityCode: '1',
    title: 'Algiers Builders Hackathon',
    description: 'Two days of building with founders across Algiers.',
    venueName: 'Sylabs',
    venueAddress: '12 Rue des Entrepreneurs, Alger',
    latitude: 36.7538,
    longitude: 3.0588,
    startsAt: kickoff,
    endsAt: kickoff + 2 * DAY,
    languages: ['ar', 'fr'],
    tags: ['engineering'],
    registrationOpensAt: Date.now() + DAY,
    registrationClosesAt: kickoff - DAY,
    submissionDeadlineAt: kickoff + 2 * DAY - 3_600_000,
    judgingEndsAt: kickoff + 9 * DAY,
    attendanceModes: ['in_person'],
    teamMin: 2,
    teamMax: 4,
    capacity: 120,
    aiPolicy: 'disclosed',
    licenceNote: 'Teams keep what they build.',
    ...overrides,
  });
};

const create = (
  db: Db,
  organisationId = 'org_hackathon_lead',
  overrides: Record<string, unknown> = {},
) =>
  createHackathonDraftResolver(db, testMapProvider, {
    hostId: TEST_HOST_ID,
    organisationId,
    draft: draft(overrides),
  });

describe('creating a hackathon draft (B-HKN-06, real D1)', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
    await approvedOrganisation(db, 'org_hackathon_lead');
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

  it('writes a draft hackathon, its details, its lead and its chat in one go', async () => {
    const result = await create(db);
    if (!result.ok) throw result.error;

    const written = await getHackathon(db, result.data.eventId);
    expect(written?.event).toMatchObject({
      kind: 'hackathon',
      status: 'draft',
      hostId: TEST_HOST_ID,
      marketCode: 'DZ',
      slug: result.data.slug,
      tags: ['engineering'],
    });
    expect(written?.hackathon).toMatchObject({
      reviewStatus: 'draft',
      attendanceModes: ['in_person'],
      teamMin: 2,
      teamMax: 4,
      capacity: 120,
      minimumAge: null,
      rules: null,
      aiPolicy: 'disclosed',
      aiPolicyNote: null,
      licenceNote: 'Teams keep what they build.',
    });
    expect(
      await db
        .select({
          organisationId: eventOrganisers.organisationId,
          role: eventOrganisers.role,
        })
        .from(eventOrganisers)
        .where(eq(eventOrganisers.eventId, result.data.eventId)),
    ).toEqual([{ organisationId: 'org_hackathon_lead', role: 'lead' }]);
    expect(
      await db
        .select({ id: chatChannels.id })
        .from(chatChannels)
        .where(eq(chatChannels.eventId, result.data.eventId)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: eventRsvps.id })
        .from(eventRsvps)
        .where(eq(eventRsvps.eventId, result.data.eventId)),
    ).toEqual([]);
  });

  it('logs the draft by ids alone, with nothing its organiser wrote', async () => {
    const result = await create(db);
    if (!result.ok) throw result.error;

    const line = entries.find(
      (entry) => entry.msg === 'hackathon_draft_created',
    );
    expect(line).toMatchObject({
      eventId: result.data.eventId,
      organisationId: 'org_hackathon_lead',
      market: 'DZ',
    });
    expect(JSON.stringify(entries)).not.toContain('Algiers Builders Hackathon');
    expect(JSON.stringify(entries)).not.toContain('Sylabs');
  });

  it('keeps the draft off the market page', async () => {
    const result = await create(db);
    if (!result.ok) throw result.error;

    const landing = await resolveMarketLanding(db, 'DZ');
    if (!landing.ok) throw landing.error;
    expect(landing.data.events.map((event) => event.id)).not.toContain(
      result.data.eventId,
    );
  });

  it('gives a second draft of the same name its own address', async () => {
    const first = await create(db);
    const second = await create(db);
    if (!first.ok || !second.ok) throw new Error('a draft was refused');

    expect(second.data.slug).not.toBe(first.data.slug);
    expect(second.data.slug).toBe(
      `algiers-builders-hackathon-${second.data.eventId.replace(/^evt_/, '')}`,
    );
  });

  it('refuses while the market has hackathons off, and writes nothing', async () => {
    await setHackathons(db, false);
    const before = await db.select({ id: events.id }).from(events);

    const result = await create(db);

    expect(result.ok ? null : result.error.code).toBe('hackathons_disabled');
    expect(await db.select({ id: events.id }).from(events)).toEqual(before);
  });

  it('refuses an organisation from another market, and writes nothing', async () => {
    await approvedOrganisation(db, 'org_from_egypt', 'EG');
    const before = await db.select({ id: events.id }).from(events);

    const result = await create(db, 'org_from_egypt');

    expect(result.ok ? null : result.error.code).toBe('forbidden');
    expect(await db.select({ id: events.id }).from(events)).toEqual(before);
  });

  it('refuses where the market takes no new events', async () => {
    await db.run(
      sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.events', json('false')) WHERE code = 'DZ'`,
    );

    const result = await create(db);

    expect(result.ok ? null : result.error.code).toBe(
      'event_creation_disabled',
    );
  });
});
