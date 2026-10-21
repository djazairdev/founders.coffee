import { beforeAll, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import {
  addHackathonCriterion,
  listHackathonCriteria,
  type HackathonCriterionFields,
} from './hackathon-criteria.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import { events, hackathonCriteria } from './schema.js';

let db: Db;
let sequence = 0;

const criterionId = () => {
  sequence += 1;
  return `crt_${String(sequence).padStart(32, '0')}`;
};

const criterion = (
  name: string,
  weight: number,
  scale: 5 | 10 = 10,
): HackathonCriterionFields => ({
  name,
  description: `How well the team did on ${name.toLowerCase()}.`,
  weight,
  scale,
});

const add = (eventId: string, fields: HackathonCriterionFields) =>
  addHackathonCriterion(db, { id: criterionId(), eventId, criterion: fields });

const newHackathon = async () => {
  const row = hackathonEventRow();
  await createHackathon(db, row);
  return row.id;
};

describe('judging criteria (B-HKN-05, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('adds a rubric in order, with each weight and scale', async () => {
    const eventId = await newHackathon();
    await batch(db, [
      add(eventId, criterion('Impact', 40)),
      add(eventId, criterion('Execution', 35)),
      add(eventId, criterion('Presentation', 25, 5)),
    ]);

    expect(
      (await listHackathonCriteria(db, eventId)).map(
        ({ name, weight, scale, position }) => ({
          name,
          weight,
          scale,
          position,
        }),
      ),
    ).toEqual([
      { name: 'Impact', weight: 40, scale: 10, position: 0 },
      { name: 'Execution', weight: 35, scale: 10, position: 1 },
      { name: 'Presentation', weight: 25, scale: 5, position: 2 },
    ]);
  });

  it('writes no criterion for an event without hackathon details', async () => {
    const meetup = hackathonEventRow('meetup');
    await createHackathon(db, meetup);

    await add(meetup.id, criterion('Impact', 40));

    expect(await listHackathonCriteria(db, meetup.id)).toEqual([]);
  });

  it('refuses a weight or a scale outside its range', async () => {
    const eventId = await newHackathon();

    await expect(add(eventId, criterion('Impact', 0))).rejects.toThrow();
    await expect(add(eventId, criterion('Impact', 101))).rejects.toThrow();
    await expect(
      add(eventId, { ...criterion('Impact', 40), scale: 7 as 5 }),
    ).rejects.toThrow();
    expect(await listHackathonCriteria(db, eventId)).toEqual([]);
  });

  it('deletes the rubric with its hackathon', async () => {
    const eventId = await newHackathon();
    await add(eventId, criterion('Impact', 40));

    await db.delete(events).where(eq(events.id, eventId));

    expect(
      await db
        .select()
        .from(hackathonCriteria)
        .where(eq(hackathonCriteria.eventId, eventId)),
    ).toEqual([]);
  });
});
