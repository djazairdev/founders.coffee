import { describe, expect, it } from 'vitest';

import { getMarketByCode, type Db } from '@founders-coffee/db';

import {
  DAY,
  hackathonWithDetails,
  setHackathons,
  setupHackathonDb,
} from '../hackathons/edit.fixtures.js';
import { resolveMarketHackathons } from './hackathons.js';
import { resolveMarketLanding } from './resolver.js';

const listedAt = async (db: Db, now?: number) => {
  const market = await getMarketByCode(db, 'DZ');
  if (!market) throw new Error('DZ is seeded');
  const listed = await resolveMarketHackathons(db, market, now);
  return listed.map((hackathon) => hackathon.id);
};

describe('hackathons on the market page (B-HKN-20, real D1)', () => {
  it('lists the market’s published hackathons with their phase, and no draft', async () => {
    const db = await setupHackathonDb();
    const published = await hackathonWithDetails(db, {}, true);
    const draft = await hackathonWithDetails(db, {}, false);

    const landing = await resolveMarketLanding(db, 'DZ');
    if (!landing.ok) throw landing.error;

    const listed = landing.data.hackathons;
    expect(listed.map((hackathon) => hackathon.id)).toContain(
      published.eventId,
    );
    expect(listed.map((hackathon) => hackathon.id)).not.toContain(
      draft.eventId,
    );
    expect(
      listed.find((hackathon) => hackathon.id === published.eventId),
    ).toMatchObject({
      id: published.eventId,
      title: 'Algiers Builders Hackathon',
      schedule: { phase: 'upcoming', kickoffAt: published.kickoff },
    });
  });

  it('keeps a hackathon until its judging ends', async () => {
    const db = await setupHackathonDb();
    const { eventId, kickoff } = await hackathonWithDetails(db, {}, true);

    expect(await listedAt(db, kickoff + 9 * DAY - 1000)).toContain(eventId);
    expect(await listedAt(db, kickoff + 9 * DAY)).not.toContain(eventId);
  });

  it('lists nothing where the market has hackathons off', async () => {
    const db = await setupHackathonDb();
    await hackathonWithDetails(db, {}, true);
    await setHackathons(db, false);

    expect(await listedAt(db)).toEqual([]);
  });
});
