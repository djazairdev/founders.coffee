import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  createDb,
  eq,
  getMemberProfile,
  listIndexableProfiles,
  user,
} from '@founders-coffee/db';
import { profile } from '@founders-coffee/domain';

import {
  readOwnerProfile,
  readPublicProfile,
  saveDisplayName,
  saveOwnerProfile,
} from './resolver.js';

const setup = async () => {
  const db = createDb(env.DB);
  const userId = id('usr');
  await db
    .insert(user)
    .values({ id: userId, name: 'Amina', email: `${userId}@test.coffee` });
  return { db, userId };
};

const command = (changes: Record<string, unknown> = {}) =>
  profile.updateProfileSchema.parse({
    displayName: 'Amina',
    expectedRevision: 0,
    ...changes,
  });

const listed = async (db: ReturnType<typeof createDb>, userId: string) =>
  (await listIndexableProfiles(db)).some((row) => row.userId === userId);

describe('the search-engine switch against real D1 (B-PRF-04)', () => {
  it('starts off, for a member who never saved and for one who saved without it', async () => {
    const { db, userId } = await setup();
    expect(await readOwnerProfile(db, userId)).toMatchObject({
      data: { indexable: false },
    });

    await saveOwnerProfile(db, userId, command());

    expect((await getMemberProfile(db, userId))?.profile.profileIndexable).toBe(
      false,
    );
    expect(await readPublicProfile(db, userId)).toMatchObject({
      data: { indexable: false },
    });
    expect(await listed(db, userId)).toBe(false);
  });

  it('turns on and off with a save, and a name change keeps it', async () => {
    const { db, userId } = await setup();

    await saveOwnerProfile(db, userId, command({ indexable: true }));
    expect(await readPublicProfile(db, userId)).toMatchObject({
      data: { indexable: true },
    });
    expect(await listed(db, userId)).toBe(true);

    await saveDisplayName(db, userId, {
      displayName: 'Amina B.',
      expectedRevision: 1,
    });
    expect(await readOwnerProfile(db, userId)).toMatchObject({
      data: { displayName: 'Amina B.', indexable: true },
    });

    await saveOwnerProfile(
      db,
      userId,
      command({ displayName: 'Amina B.', expectedRevision: 2 }),
    );
    expect(await readPublicProfile(db, userId)).toMatchObject({
      data: { indexable: false },
    });
    expect(await listed(db, userId)).toBe(false);
  });

  it('drops a listed member from the list once their account is closing or banned', async () => {
    const closing = await setup();
    const banned = await setup();
    for (const { db, userId } of [closing, banned])
      await saveOwnerProfile(db, userId, command({ indexable: true }));

    await closing.db
      .update(user)
      .set({ accountState: 'closing' })
      .where(eq(user.id, closing.userId));
    await banned.db
      .update(user)
      .set({ banned: true })
      .where(eq(user.id, banned.userId));

    for (const { db, userId } of [closing, banned]) {
      expect(await listed(db, userId)).toBe(false);
      expect(await readPublicProfile(db, userId)).toMatchObject({
        ok: false,
        error: { code: 'not_found' },
      });
    }
  });
});
