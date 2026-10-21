import { beforeAll, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { baseEvent, setupDb } from './events.fixtures.js';
import {
  getHackathon,
  insertHackathonDetails,
  type HackathonDetails,
} from './hackathons.js';
import { events, hackathons, type NewEvent } from './schema.js';

let db: Db;
let sequence = 0;

const eventRow = (kind: NewEvent['kind'] = 'hackathon'): NewEvent => {
  sequence += 1;
  return {
    ...baseEvent,
    id: `evt_hkn${String(sequence).padStart(3, '0')}`,
    slug: `hackathon-${sequence}`,
    kind,
    format: 'online',
    venue: null,
    startsAt: new Date('2099-01-22T09:00:00Z'),
    endsAt: new Date('2099-01-30T18:00:00Z'),
  };
};

const details: HackathonDetails = {
  rules: 'Build something useful for your city in a week.',
  minimumAge: 16,
  attendanceModes: ['online'],
  teamMin: 2,
  teamMax: 5,
  capacity: 200,
  registrationOpensAt: new Date('2099-01-04T09:00:00Z'),
  registrationClosesAt: new Date('2099-01-20T23:00:00Z'),
  submissionDeadlineAt: new Date('2099-01-29T18:00:00Z'),
  judgingEndsAt: new Date('2099-02-05T18:00:00Z'),
  aiPolicy: 'disclosed',
  aiPolicyNote: 'Say which tools you used.',
  licenceNote: 'Teams keep their code.',
};

const createHackathon = async (
  row: NewEvent,
  values: HackathonDetails = details,
) =>
  batch(db, [
    db.insert(events).values(row).onConflictDoNothing(),
    insertHackathonDetails(db, { eventId: row.id, details: values }),
  ]);

const detailsOf = (eventId: string) =>
  db.select().from(hackathons).where(eq(hackathons.eventId, eventId));

describe('hackathon details (B-HKN-01, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('writes the details beside a hackathon event in its batch, as a draft for review', async () => {
    const row = eventRow();
    await createHackathon(row);

    const found = await getHackathon(db, row.id);
    expect(found?.event).toMatchObject({ id: row.id, kind: 'hackathon' });
    expect(found?.hackathon).toMatchObject({
      ...details,
      eventId: row.id,
      reviewStatus: 'draft',
      reviewNote: null,
      resultsPublishedAt: null,
    });
    expect(found?.hackathon.createdAt).toBeInstanceOf(Date);
  });

  it('keeps an open minimum age and capacity as none', async () => {
    const row = eventRow();
    await createHackathon(row, {
      ...details,
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
    const row = eventRow('meetup');
    await createHackathon(row);

    expect(await detailsOf(row.id)).toEqual([]);
    expect(await getHackathon(db, row.id)).toBeNull();
  });

  it('writes nothing for an event that was not written', async () => {
    const first = eventRow();
    await createHackathon(first);
    const second = { ...eventRow(), slug: first.slug };

    await createHackathon(second);

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
    const row = eventRow();

    await expect(
      createHackathon(row, { ...details, ...change }),
    ).rejects.toThrow();
    expect(await db.select().from(events).where(eq(events.id, row.id))).toEqual(
      [],
    );
  });

  it('goes with its event', async () => {
    const row = eventRow();
    await createHackathon(row);

    await db.delete(events).where(eq(events.id, row.id));

    expect(await detailsOf(row.id)).toEqual([]);
  });
});
