import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  createDb,
  eq,
  hackathonInterest,
  insertHackathonInterest,
  seed,
  type Db,
} from '@founders-coffee/db';

import { sweepExpiredHackathonInterest } from './hackathon-interest-retention.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const setupDb = async (): Promise<Db> => {
  const db = createDb(env.DB);
  await seed(db);
  await db.delete(hackathonInterest).run();
  return db;
};

const entry = async (db: Db, email: string, notifiedDaysAgo: number | null) => {
  const entryId = id('hint');
  await insertHackathonInterest(db, {
    id: entryId,
    email,
    marketCode: 'DZ',
    locale: 'ar',
  });
  if (notifiedDaysAgo !== null)
    await db
      .update(hackathonInterest)
      .set({ notifiedAt: new Date(Date.now() - notifiedDaysAgo * DAY_MS) })
      .where(eq(hackathonInterest.id, entryId))
      .run();
  return entryId;
};

const remaining = async (db: Db) =>
  (await db.select({ email: hackathonInterest.email }).from(hackathonInterest))
    .map((row) => row.email)
    .sort();

describe('the hackathon interest retention sweep (real D1)', () => {
  it('deletes an address twelve months after its notice, and keeps every other', async () => {
    const db = await setupDb();
    await entry(db, 'expired@interest.test', 366);
    await entry(db, 'recent@interest.test', 30);
    await entry(db, 'waiting@interest.test', null);

    expect(await sweepExpiredHackathonInterest(db)).toBe(1);
    expect(await remaining(db)).toEqual([
      'recent@interest.test',
      'waiting@interest.test',
    ]);
  });
});
