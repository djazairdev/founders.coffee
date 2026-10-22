import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { eraseClosedAccount } from './account-closure.js';
import { person } from './account-closure.fixtures.js';
import { setupDb } from './events.fixtures.js';
import { register } from './hackathon-teams.fixtures.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import type { Db } from './db.js';
import { hackathonRegistrations, hackathons, user } from './schema.js';

const holding = async (db: Db, eventId: string, count: number) =>
  db
    .update(hackathons)
    .set({ registeredCount: count })
    .where(eq(hackathons.eventId, eventId));

const countOf = async (db: Db, eventId: string) =>
  (
    await db
      .select({ count: hackathons.registeredCount })
      .from(hackathons)
      .where(eq(hackathons.eventId, eventId))
  )[0]?.count;

describe('account closure and hackathon registrations (real D1, B-REG-01)', () => {
  it('deletes the member’s registrations and gives back the place they held', async () => {
    const db = await setupDb();
    const closing = await person(db, 'Leaving');
    const staying = await person(db, 'Staying');
    const full = hackathonEventRow();
    const waiting = hackathonEventRow();
    await createHackathon(db, full);
    await createHackathon(db, waiting);
    await register(db, full.id, closing.id, 'registered');
    await register(db, full.id, staying.id, 'registered');
    await holding(db, full.id, 2);
    await register(db, waiting.id, closing.id, 'waitlisted');
    await holding(db, waiting.id, 1);
    await db
      .update(user)
      .set({ accountState: 'closing', closedAt: new Date() })
      .where(eq(user.id, closing.id));

    expect(
      await eraseClosedAccount(db, { ...closing, phoneNumber: null }),
    ).toBe(true);

    expect(
      await db
        .select({ userId: hackathonRegistrations.userId })
        .from(hackathonRegistrations)
        .where(eq(hackathonRegistrations.userId, closing.id)),
    ).toEqual([]);
    expect(await countOf(db, full.id)).toBe(1);
    expect(
      await countOf(db, waiting.id),
      'a waitlisted registration held no place, so none is given back',
    ).toBe(1);
    expect(
      (
        await db
          .select({ n: sql<number>`count(*)` })
          .from(hackathonRegistrations)
          .where(eq(hackathonRegistrations.userId, staying.id))
      )[0]?.n,
    ).toBe(1);
  });

  it('leaves a count already at zero alone rather than failing the erasure', async () => {
    const db = await setupDb();
    const closing = await person(db, 'Drifted');
    const hackathon = hackathonEventRow();
    await createHackathon(db, hackathon);
    await register(db, hackathon.id, closing.id, 'registered');
    await db
      .update(user)
      .set({ accountState: 'closing', closedAt: new Date() })
      .where(eq(user.id, closing.id));

    expect(
      await eraseClosedAccount(db, { ...closing, phoneNumber: null }),
    ).toBe(true);
    expect(await countOf(db, hackathon.id)).toBe(0);
  });
});
