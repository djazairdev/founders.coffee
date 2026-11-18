import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { createDb, seed, type Db } from '@founders-coffee/db';

import { requireHackathonsEnabled } from './flag.js';

const setHackathons = (db: Db, value: boolean) =>
  db.run(
    sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json(${value ? 'true' : 'false'})) WHERE code = 'DZ'`,
  );

describe('requireHackathonsEnabled', () => {
  let db: Db;

  beforeEach(async () => {
    db = createDb(env.DB);
    await seed(db);
  });

  afterEach(async () => {
    await setHackathons(db, false);
  });

  it('refuses with the typed code while the flag is off', async () => {
    const refusal = await requireHackathonsEnabled(db, 'DZ');

    expect(refusal?.code).toBe('hackathons_disabled');
  });

  it('refuses an unknown market', async () => {
    expect((await requireHackathonsEnabled(db, 'ZZ'))?.code).toBe(
      'hackathons_disabled',
    );
  });

  it('lets the call through once the market turns hackathons on', async () => {
    await setHackathons(db, true);

    expect(await requireHackathonsEnabled(db, 'DZ')).toBeNull();
    expect((await requireHackathonsEnabled(db, 'EG'))?.code).toBe(
      'hackathons_disabled',
    );
  });
});
