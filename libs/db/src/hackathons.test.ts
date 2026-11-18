import { beforeAll, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import {
  createHackathon,
  hackathonDetails,
  hackathonEventRow,
} from './hackathons.fixtures.js';
import { getHackathon } from './hackathons.js';
import { events, hackathons } from './schema.js';

let db: Db;

const detailsOf = (eventId: string) =>
  db.select().from(hackathons).where(eq(hackathons.eventId, eventId));

describe('hackathon details (B-HKN-01, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('writes the details beside a hackathon event in its batch, as a draft for review', async () => {
    const row = hackathonEventRow();
    await createHackathon(db, row);

    const found = await getHackathon(db, row.id);
    expect(found?.event).toMatchObject({ id: row.id, kind: 'hackathon' });
    expect(found?.hackathon).toMatchObject({
      ...hackathonDetails,
      eventId: row.id,
      reviewStatus: 'draft',
      reviewNote: null,
      resultsPublishedAt: null,
    });
    expect(found?.hackathon.createdAt).toBeInstanceOf(Date);
  });

  it('keeps an open minimum age and capacity as none', async () => {
    const row = hackathonEventRow();
    await createHackathon(db, row, {
      ...hackathonDetails,
      minimumAge: null,
      capacity: null,
      rules: null,
      attendanceModes: ['in_person', 'online'],
    });

    expect((await getHackathon(db, row.id))?.hackathon).toMatchObject({
      minimumAge: null,
      capacity: null,
      rules: null,
      attendanceModes: ['in_person', 'online'],
    });
  });

  it('never gives a meetup hackathon details', async () => {
    const row = hackathonEventRow('meetup');
    await createHackathon(db, row);

    expect(await detailsOf(row.id)).toEqual([]);
    expect(await getHackathon(db, row.id)).toBeNull();
  });

  it('writes nothing for an event that was not written', async () => {
    const first = hackathonEventRow();
    await createHackathon(db, first);
    const second = { ...hackathonEventRow(), slug: first.slug };

    await createHackathon(db, second);

    expect(
      await db.select().from(events).where(eq(events.id, second.id)),
    ).toEqual([]);
    expect(await detailsOf(second.id)).toEqual([]);
  });

  it.each([
    ['a team smaller than one', { teamMin: 0 }],
    ['a largest team below the smallest', { teamMin: 4, teamMax: 3 }],
    ['no places', { capacity: 0 }],
    ['an age of zero', { minimumAge: 0 }],
    [
      'registration closing before it opens',
      { registrationClosesAt: new Date('2099-01-03T09:00:00Z') },
    ],
    [
      'judging ending before submissions close',
      { judgingEndsAt: new Date('2099-01-29T18:00:00Z') },
    ],
  ])('refuses %s, and the event with it', async (_, change) => {
    const row = hackathonEventRow();

    await expect(
      createHackathon(db, row, { ...hackathonDetails, ...change }),
    ).rejects.toThrow();
    expect(await db.select().from(events).where(eq(events.id, row.id))).toEqual(
      [],
    );
  });

  it('goes with its event', async () => {
    const row = hackathonEventRow();
    await createHackathon(db, row);

    await db.delete(events).where(eq(events.id, row.id));

    expect(await detailsOf(row.id)).toEqual([]);
  });
});
