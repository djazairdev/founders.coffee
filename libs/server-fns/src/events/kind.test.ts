import { describe, expect, it } from 'vitest';

import { eq, events, getEvent } from '@founders-coffee/db';

import { createEventResolver } from './resolver.js';
import {
  createInput,
  setupDb,
  testMapProvider,
  TEST_HOST_ID,
} from './resolver.fixtures.js';
import { apply, hostAnEvent } from './update.fixtures.js';

describe('the kind of an event (real D1)', () => {
  it('files an event created without a kind as a meetup', async () => {
    const db = await setupDb();

    const result = await createEventResolver(
      db,
      testMapProvider,
      TEST_HOST_ID,
      createInput(),
    );

    expect(result.ok).toBe(true);
    if (result.ok)
      expect((await getEvent(db, result.data.id))?.kind).toBe('meetup');
  });

  it('keeps a workshop a host creates', async () => {
    const db = await setupDb();

    const result = await createEventResolver(
      db,
      testMapProvider,
      TEST_HOST_ID,
      createInput({ kind: 'workshop', title: 'Pitch deck workshop' }),
    );

    expect(result.ok).toBe(true);
    if (result.ok)
      expect((await getEvent(db, result.data.id))?.kind).toBe('workshop');
  });

  it('lets a host turn a meetup into a workshop, and leaves the kind alone when the edit omits it', async () => {
    const db = await setupDb();
    const event = await hostAnEvent(db);

    expect((await apply(db, event, { kind: 'workshop' })).ok).toBe(true);
    const workshop = await getEvent(db, event.id);
    expect(workshop?.kind).toBe('workshop');

    if (!workshop) return;
    expect((await apply(db, workshop, { title: 'Renamed workshop' })).ok).toBe(
      true,
    );
    expect((await getEvent(db, event.id))?.kind).toBe('workshop');
  });

  it('never turns a hackathon into a meetup from the meetup editor', async () => {
    const db = await setupDb();
    const event = await hostAnEvent(db);
    await db
      .update(events)
      .set({ kind: 'hackathon' })
      .where(eq(events.id, event.id))
      .run();
    const hackathon = await getEvent(db, event.id);
    if (!hackathon) throw new Error('the hackathon was not stored');

    const result = await apply(db, hackathon, { kind: 'meetup' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('event_kind_immutable');
    expect((await getEvent(db, event.id))?.kind).toBe('hackathon');
  });
});
