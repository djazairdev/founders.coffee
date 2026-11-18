import { describe, expect, it } from 'vitest';

import { getEvent } from '@founders-coffee/db';

import { createEventResolver } from './create-resolver.js';
import {
  createInput,
  setupDb,
  testMapProvider,
  TEST_HOST_ID,
} from './resolver.fixtures.js';
import { apply, hostAnEvent } from './update.fixtures.js';

const LINK = 'https://meet.example.com/founders';
const ONLINE = {
  format: 'online',
  meetingUrl: LINK,
  cityCode: '556',
  venueName: undefined,
  venueAddress: undefined,
  latitude: undefined,
  longitude: undefined,
};
const NO_VENUE = { venueName: undefined };

describe('the format of an event (real D1, B-EVT-09)', () => {
  it('stores an in-person event as before, with no link', async () => {
    const db = await setupDb();
    const event = await hostAnEvent(db);

    expect(await getEvent(db, event.id)).toMatchObject({
      format: 'in_person',
      meetingUrl: null,
      venue: 'Café des Délices',
    });
  });

  it('stores an online event in the city it names, with its link and no venue', async () => {
    const db = await setupDb();
    const result = await createEventResolver(
      db,
      testMapProvider,
      TEST_HOST_ID,
      createInput(ONLINE),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await getEvent(db, result.data.id)).toMatchObject({
      format: 'online',
      meetingUrl: LINK,
      stateCode: '16',
      cityCode: '556',
      venue: null,
      venueAddress: null,
      latitude: null,
      longitude: null,
    });
  });

  it('stores a hybrid event with both its venue and its link', async () => {
    const db = await setupDb();
    const event = await hostAnEvent(db, { format: 'hybrid', meetingUrl: LINK });

    expect(await getEvent(db, event.id)).toMatchObject({
      format: 'hybrid',
      meetingUrl: LINK,
      venue: 'Café des Délices',
    });
  });

  it('lets a host change the link, and keeps it when an edit leaves it out', async () => {
    const db = await setupDb();
    const event = await hostAnEvent(db, ONLINE);
    const moved = 'https://meet.example.com/another-room';

    expect(
      (await apply(db, event, { ...NO_VENUE, meetingUrl: moved })).ok,
    ).toBe(true);
    const changed = await getEvent(db, event.id);
    expect(changed?.meetingUrl).toBe(moved);

    if (!changed) return;
    expect(
      (await apply(db, changed, { ...NO_VENUE, title: 'Renamed online' })).ok,
    ).toBe(true);
    expect(await getEvent(db, event.id)).toMatchObject({
      title: 'Renamed online',
      meetingUrl: moved,
      venue: null,
    });
  });

  it('refuses an edit that changes the format, and changes nothing', async () => {
    const db = await setupDb();
    const event = await hostAnEvent(db);

    const result = await apply(db, event, {
      format: 'hybrid',
      meetingUrl: LINK,
    });

    expect(!result.ok && result.error.code).toBe('event_format_immutable');
    expect(await getEvent(db, event.id)).toMatchObject({
      format: 'in_person',
      meetingUrl: null,
      version: event.version,
    });
  });

  it('refuses an edit that does not fit the stored format', async () => {
    const db = await setupDb();
    const inPerson = await hostAnEvent(db);
    const online = await hostAnEvent(db, { ...ONLINE, title: 'Online one' });

    const cases = [
      await apply(db, inPerson, NO_VENUE),
      await apply(db, inPerson, { meetingUrl: LINK }),
      await apply(db, online, { venueName: 'A café after all' }),
    ];

    expect(cases.map((result) => !result.ok && result.error.code)).toEqual([
      'validation_failed',
      'validation_failed',
      'validation_failed',
    ]);
    expect((await getEvent(db, inPerson.id))?.version).toBe(inPerson.version);
    expect((await getEvent(db, online.id))?.version).toBe(online.version);
  });
});
