import { beforeAll, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import {
  addHackathonTrack,
  listHackathonTracks,
  type HackathonTrackFields,
} from './hackathon-tracks.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import { events, hackathonTracks } from './schema.js';

let db: Db;
let sequence = 0;

const trackId = () => {
  sequence += 1;
  return `trk_${String(sequence).padStart(32, '0')}`;
};

const brief = 'Build something founders in Algiers need this year.';

const founderProblem: HackathonTrackFields = {
  kind: 'founder_problem',
  title: 'Invoices for small shops',
  brief,
  partnerName: null,
  sourceUrls: [],
};

const partnerTechnology: HackathonTrackFields = {
  kind: 'partner_technology',
  title: 'Build on a partner API',
  brief,
  partnerName: 'Yassir',
  sourceUrls: [],
};

const openSource: HackathonTrackFields = {
  kind: 'open_source',
  title: 'Open source with djazair.dev',
  brief,
  partnerName: null,
  sourceUrls: [
    'https://github.com/djazairdev/wilayas',
    'https://github.com/djazairdev/detent/issues/13',
  ],
};

const add = (eventId: string, track: HackathonTrackFields) =>
  addHackathonTrack(db, { id: trackId(), eventId, track });

const newHackathon = async () => {
  const row = hackathonEventRow();
  await createHackathon(db, row);
  return row.id;
};

describe('hackathon tracks (B-HKN-03, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('adds tracks in order, each kind with its own fields', async () => {
    const eventId = await newHackathon();
    await batch(db, [
      add(eventId, founderProblem),
      add(eventId, partnerTechnology),
      add(eventId, openSource),
    ]);

    const tracks = await listHackathonTracks(db, eventId);

    expect(
      tracks.map(({ kind, position, partnerName, sourceUrls }) => ({
        kind,
        position,
        partnerName,
        sourceUrls,
      })),
    ).toEqual([
      {
        kind: 'founder_problem',
        position: 0,
        partnerName: null,
        sourceUrls: [],
      },
      {
        kind: 'partner_technology',
        position: 1,
        partnerName: 'Yassir',
        sourceUrls: [],
      },
      {
        kind: 'open_source',
        position: 2,
        partnerName: null,
        sourceUrls: openSource.sourceUrls,
      },
    ]);
  });

  it('continues after the last track when more are added later', async () => {
    const eventId = await newHackathon();
    await add(eventId, founderProblem);
    await add(eventId, openSource);

    expect(
      (await listHackathonTracks(db, eventId)).map((track) => track.position),
    ).toEqual([0, 1]);
  });

  it('writes no track for an event without hackathon details', async () => {
    const meetup = hackathonEventRow('meetup');
    await createHackathon(db, meetup);

    await add(meetup.id, founderProblem);
    await add('evt_missing', founderProblem);

    expect(await listHackathonTracks(db, meetup.id)).toEqual([]);
    expect(await listHackathonTracks(db, 'evt_missing')).toEqual([]);
  });

  it('refuses a partner track without its partner, and a partner on any other', async () => {
    const eventId = await newHackathon();

    await expect(
      add(eventId, { ...partnerTechnology, partnerName: null }),
    ).rejects.toThrow();
    await expect(
      add(eventId, { ...founderProblem, partnerName: 'Yassir' }),
    ).rejects.toThrow();
    expect(await listHackathonTracks(db, eventId)).toEqual([]);
  });

  it('refuses an open-source track without sources, and sources on any other', async () => {
    const eventId = await newHackathon();

    await expect(
      add(eventId, { ...openSource, sourceUrls: [] }),
    ).rejects.toThrow();
    await expect(
      add(eventId, {
        ...founderProblem,
        sourceUrls: openSource.sourceUrls,
      }),
    ).rejects.toThrow();
    expect(await listHackathonTracks(db, eventId)).toEqual([]);
  });

  it('deletes the tracks with their hackathon', async () => {
    const eventId = await newHackathon();
    await add(eventId, founderProblem);

    await db.delete(events).where(eq(events.id, eventId));

    expect(
      await db
        .select()
        .from(hackathonTracks)
        .where(eq(hackathonTracks.eventId, eventId)),
    ).toEqual([]);
  });
});
