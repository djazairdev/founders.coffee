import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { id } from '@founders-coffee/core';
import { createDb, seed, user, type Db } from '@founders-coffee/db';

import { readMyPreferences, saveMyPreferences } from './preferences.js';

const setup = async () => {
  const db = createDb(env.DB);
  await seed(db);
  const userId = id('usr');
  await db.insert(user).values({
    id: userId,
    name: 'Hackathon Member',
    email: `${userId}@test.coffee`,
    emailVerified: true,
  });
  return { db, userId };
};

const setHackathons = (db: Db, code: string, value: boolean) =>
  db.run(
    sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json(${value ? 'true' : 'false'})) WHERE code = ${code}`,
  );

const saveWith = async (
  db: Db,
  userId: string,
  hackathons: boolean,
  hackathonsChannels: ('push' | 'email')[],
) => {
  const current = await readMyPreferences(db, userId);
  if (!current.ok) throw current.error;
  return saveMyPreferences(db, userId, {
    ...current.data.preferences,
    hackathons,
    hackathonsChannels,
    expectedRevision: current.data.revision,
  });
};

describe('the Hackathons notification category', () => {
  it('starts on, by push and email, for a member who never chose', async () => {
    const { db, userId } = await setup();

    const read = await readMyPreferences(db, userId);

    expect(read.ok && read.data.preferences.hackathons).toBe(true);
    expect(read.ok && read.data.preferences.hackathonsChannels).toEqual([
      'push',
      'email',
    ]);
  });

  it('is turned off, and back on with email only, as its own category', async () => {
    const { db, userId } = await setup();

    const off = await saveWith(db, userId, false, ['push', 'email']);
    expect(off.ok && off.data.preferences.hackathons).toBe(false);
    expect(off.ok && off.data.preferences.hackathonsChannels).toEqual([]);
    expect(off.ok && off.data.preferences.eventUpdates).toBe(true);

    const emailOnly = await saveWith(db, userId, true, ['email']);
    expect(emailOnly.ok && emailOnly.data.preferences.hackathons).toBe(true);
    expect(
      emailOnly.ok && emailOnly.data.preferences.hackathonsChannels,
    ).toEqual(['email']);
  });

  it('is offered only once some market runs hackathons', async () => {
    const { db, userId } = await setup();
    try {
      const closed = await readMyPreferences(db, userId);
      await setHackathons(db, 'SA', true);
      const opened = await readMyPreferences(db, userId);

      expect(closed.ok && closed.data.hackathonsAvailable).toBe(false);
      expect(opened.ok && opened.data.hackathonsAvailable).toBe(true);
    } finally {
      await setHackathons(db, 'SA', false);
    }
  });
});
