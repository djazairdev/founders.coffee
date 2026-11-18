import { env } from 'cloudflare:workers';
import { describe, expect, it, vi } from 'vitest';

import {
  createDb,
  eq,
  hackathonInterest,
  markets,
  seed,
  type Db,
} from '@founders-coffee/db';

import { joinHackathonInterestResolver } from './interest.js';

const setupDb = async (): Promise<Db> => {
  const db = createDb(env.DB);
  await seed(db);
  await db.delete(hackathonInterest).run();
  await db
    .update(markets)
    .set({
      state: 'active',
      featureFlags: {
        events: true,
        hackathons: false,
        payments: false,
        recruiting: false,
      },
    })
    .where(eq(markets.code, 'DZ'))
    .run();
  return db;
};

const fakeMetrics = () => ({ trackEvent: vi.fn(), trackCount: vi.fn() });

const join = (
  db: Db,
  metrics: ReturnType<typeof fakeMetrics> | null,
  email = 'builder@interest.test',
) =>
  joinHackathonInterestResolver(db, metrics, {
    email,
    marketCode: 'DZ',
    locale: 'fr',
  });

describe('joining the hackathon interest list (real D1)', () => {
  it('gives the same answer to a new address and to one already there', async () => {
    const db = await setupDb();

    const first = await join(db, null);
    const again = await join(db, null);

    expect(first).toEqual({ ok: true, data: { status: 'received' } });
    expect(again).toEqual(first);
    expect(
      await db
        .select({
          email: hackathonInterest.email,
          marketCode: hackathonInterest.marketCode,
          locale: hackathonInterest.locale,
          notifiedAt: hackathonInterest.notifiedAt,
        })
        .from(hackathonInterest),
    ).toEqual([
      {
        email: 'builder@interest.test',
        marketCode: 'DZ',
        locale: 'fr',
        notifiedAt: null,
      },
    ]);
  });

  it('takes an address while the market has hackathons switched off', async () => {
    const db = await setupDb();
    const [market] = await db
      .select({ flags: markets.featureFlags })
      .from(markets)
      .where(eq(markets.code, 'DZ'));
    expect(market?.flags.hackathons).toBe(false);

    expect((await join(db, null)).ok).toBe(true);
  });

  it('counts a new address once, by market and language and nothing else', async () => {
    const db = await setupDb();
    const metrics = fakeMetrics();

    await join(db, metrics);
    await join(db, metrics);

    expect(metrics.trackEvent).toHaveBeenCalledExactlyOnceWith(
      'hackathon_interest_joined',
      { market: 'DZ', locale: 'fr' },
    );
  });

  it('still answers when the metrics write throws', async () => {
    const db = await setupDb();
    const metrics = fakeMetrics();
    metrics.trackEvent.mockImplementation(() => {
      throw new Error('analytics down');
    });

    expect((await join(db, metrics)).ok).toBe(true);
  });

  it('refuses a market that does not exist', async () => {
    const db = await setupDb();

    const result = await joinHackathonInterestResolver(db, null, {
      email: 'builder@interest.test',
      marketCode: 'ZZ',
      locale: 'fr',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('market_not_found');
  });
});
