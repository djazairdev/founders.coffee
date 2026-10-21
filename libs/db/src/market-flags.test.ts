import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';

import { createDb, type Db } from './db.js';
import { hackathonsEnabled, marketFlagEnabled } from './market-flags.js';
import { markets } from './schema.js';
import { seed } from './seed.js';

const storeFlags = (db: Db, json: string) =>
  db.run(sql`UPDATE markets SET feature_flags = ${json} WHERE code = 'DZ'`);

describe('hackathonsEnabled', () => {
  let db: Db;
  let stored: (typeof markets.$inferSelect)['featureFlags'];

  beforeEach(async () => {
    db = createDb(env.DB);
    await seed(db);
    const [dz] = await db
      .select({ flags: markets.featureFlags })
      .from(markets)
      .where(eq(markets.code, 'DZ'));
    stored = dz.flags;
  });

  afterEach(async () => {
    await db
      .update(markets)
      .set({ featureFlags: stored })
      .where(eq(markets.code, 'DZ'));
  });

  it('is off in every configured market as shipped', async () => {
    await expect(
      Promise.all(
        ['DZ', 'EG', 'SA'].map((code) => hackathonsEnabled(db, code)),
      ),
    ).resolves.toEqual([false, false, false]);
  });

  it('is on once the market flag is set, and only in that market', async () => {
    await storeFlags(
      db,
      '{"events":true,"hackathons":true,"payments":false,"recruiting":false}',
    );

    expect(await hackathonsEnabled(db, 'DZ')).toBe(true);
    expect(await hackathonsEnabled(db, 'EG')).toBe(false);
  });

  it('resolves an absent key to off', async () => {
    await storeFlags(db, '{"events":true,"payments":false,"recruiting":false}');

    expect(await hackathonsEnabled(db, 'DZ')).toBe(false);
  });

  it('resolves a non-boolean value to off', async () => {
    await storeFlags(
      db,
      '{"events":true,"hackathons":"true","payments":false,"recruiting":false}',
    );

    expect(await hackathonsEnabled(db, 'DZ')).toBe(false);
  });

  it('resolves an unknown market to off', async () => {
    expect(await hackathonsEnabled(db, 'ZZ')).toBe(false);
  });

  it('reads each flag on its own', async () => {
    await storeFlags(
      db,
      '{"events":true,"hackathons":true,"payments":false,"recruiting":false,"communityOperations":false}',
    );

    expect(await marketFlagEnabled(db, 'DZ', 'hackathons')).toBe(true);
    expect(await marketFlagEnabled(db, 'DZ', 'communityOperations')).toBe(
      false,
    );
  });
});
