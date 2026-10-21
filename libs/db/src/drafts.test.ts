import { describe, expect, it } from 'vitest';

import { readCommunityHealthCounts } from './community-health.js';
import { createEvent } from './events.js';
import {
  baseEvent,
  nextId,
  nextSlug,
  setupDb as setupEventsDb,
} from './events.fixtures.js';
import {
  listCitiesWithUpcomingEvents,
  listPublicEventSitemapRows,
} from './events-sitemap.js';
import { pastEvent, setupDb } from './operations.fixtures.js';

const DAY = 86_400_000;

const health = (db: Awaited<ReturnType<typeof setupDb>>) => {
  const now = Date.now();
  return readCommunityHealthCounts(
    db,
    {
      market: 'DZ',
      city: '1',
      from: new Date(now - 100 * DAY).toISOString(),
      to: new Date(now).toISOString(),
      asOf: new Date(now).toISOString(),
    },
    { retentionDays: 60, recurringDays: 90, repeatDays: 90, minimumEvents: 2 },
  );
};

describe('a draft in the sitemap and the metrics (real D1, B-EVT-16)', () => {
  it('puts neither the draft nor a city it alone fills in the sitemap', async () => {
    const db = await setupEventsDb();
    const draft = {
      ...baseEvent,
      id: nextId(),
      slug: nextSlug(),
      cityCode: 'draft-only-city',
      status: 'draft' as const,
    };
    await createEvent(db, draft);

    const rows = await listPublicEventSitemapRows(db);
    const cities = await listCitiesWithUpcomingEvents(db);

    expect(rows.map((row) => row.slug)).not.toContain(draft.slug);
    expect(cities.map((city) => city.cityCode)).not.toContain(
      'draft-only-city',
    );
  });

  it('counts no ended draft among the community’s meetups', async () => {
    const db = await setupDb();
    await pastEvent(db, { endedHoursAgo: 24 });
    const before = await health(db);

    await pastEvent(db, { endedHoursAgo: 24, status: 'draft' });

    expect(await health(db)).toEqual(before);
    expect(before.ended).toBeGreaterThan(0);
  });
});
