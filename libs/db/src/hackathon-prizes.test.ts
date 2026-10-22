import { beforeAll, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import {
  addHackathonPrize,
  hackathonPrizeChange,
  listPublicHackathonPrizes,
  type HackathonPrizeFields,
} from './hackathon-prizes.js';
import { addHackathonTrack } from './hackathon-tracks.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import { events, hackathonPrizes, hackathonTracks } from './schema.js';

let db: Db;
let sequence = 0;

const nextId = (prefix: string) => {
  sequence += 1;
  return `${prefix}_${String(sequence).padStart(32, '0')}`;
};

const firstPlace: HackathonPrizeFields = {
  trackId: null,
  place: 1,
  title: 'First place',
  description: 'A year of cloud credits for the winning team.',
  providerName: 'Djazair Cloud',
  value: { amount_minor: 50_000_000, currency: 'DZD' },
};

const newHackathon = async () => {
  const row = hackathonEventRow();
  await createHackathon(db, row);
  return row.id;
};

const newTrack = async (eventId: string) => {
  const id = nextId('trk');
  await addHackathonTrack(db, {
    id,
    eventId,
    track: {
      kind: 'founder_problem',
      title: 'Invoices for small shops',
      brief: 'Build something founders in Algiers need this year.',
      partnerName: null,
      sourceUrls: [],
    },
  });
  return id;
};

const add = async (eventId: string, prize: Partial<HackathonPrizeFields>) => {
  const id = nextId('prz');
  await addHackathonPrize(db, {
    id,
    eventId,
    prize: { ...firstPlace, ...prize },
  });
  return id;
};

const confirm = (id: string) =>
  db
    .update(hackathonPrizes)
    .set({
      confirmedAt: new Date('2098-12-01T10:00:00Z'),
      confirmationNote: 'Confirmed by email from the partner on 1 December.',
    })
    .where(eq(hackathonPrizes.id, id));

const prizesOf = (eventId: string) =>
  db.select().from(hackathonPrizes).where(eq(hackathonPrizes.eventId, eventId));

describe('hackathon prizes (B-HKN-04, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('shows the public confirmed prizes only, without the private note', async () => {
    const eventId = await newHackathon();
    const confirmed = await add(eventId, {});
    await add(eventId, { place: 2, title: 'Second place', value: null });
    await confirm(confirmed);

    const prizes = await listPublicHackathonPrizes(db, eventId);

    expect(prizes).toEqual([
      {
        id: confirmed,
        trackId: null,
        place: 1,
        title: 'First place',
        description: firstPlace.description,
        providerName: 'Djazair Cloud',
        value: { amount_minor: 50_000_000, currency: 'DZD' },
        confirmedAt: new Date('2098-12-01T10:00:00Z'),
      },
    ]);
    expect(JSON.stringify(prizes)).not.toContain('Confirmed by email');
    expect(await prizesOf(eventId)).toHaveLength(2);
  });

  it('orders overall prizes first, then each track in its order, each by place', async () => {
    const eventId = await newHackathon();
    const firstTrack = await newTrack(eventId);
    const secondTrack = await newTrack(eventId);
    const ids = [
      await add(eventId, { trackId: secondTrack, place: 1 }),
      await add(eventId, { trackId: firstTrack, place: 2 }),
      await add(eventId, { place: 2, value: null }),
      await add(eventId, { trackId: firstTrack, place: 1 }),
      await add(eventId, { place: 1 }),
    ];
    for (const id of ids) await confirm(id);

    expect(
      (await listPublicHackathonPrizes(db, eventId)).map(
        ({ trackId, place }) => [trackId, place],
      ),
    ).toEqual([
      [null, 1],
      [null, 2],
      [firstTrack, 1],
      [firstTrack, 2],
      [secondTrack, 1],
    ]);
  });

  it('writes no prize for an event without hackathon details', async () => {
    const meetup = hackathonEventRow('meetup');
    await createHackathon(db, meetup);

    await add(meetup.id, {});
    await add('evt_missing', {});

    expect(await prizesOf(meetup.id)).toEqual([]);
    expect(await prizesOf('evt_missing')).toEqual([]);
  });

  it("refuses another hackathon's track", async () => {
    const eventId = await newHackathon();
    const otherTrack = await newTrack(await newHackathon());

    await expect(add(eventId, { trackId: otherTrack })).rejects.toThrow();
    await expect(add(eventId, { trackId: nextId('trk') })).rejects.toThrow();
    expect(await prizesOf(eventId)).toEqual([]);
  });

  it('refuses a place below one and a value that is half there or not positive', async () => {
    const eventId = await newHackathon();

    await expect(add(eventId, { place: 0 })).rejects.toThrow();
    await expect(
      add(eventId, { value: { amount_minor: 0, currency: 'DZD' } }),
    ).rejects.toThrow();
    await expect(
      db.insert(hackathonPrizes).values({
        id: nextId('prz'),
        eventId,
        place: 1,
        title: firstPlace.title,
        description: firstPlace.description,
        providerName: firstPlace.providerName,
        valueAmountMinor: 100,
        valueCurrency: null,
      }),
    ).rejects.toThrow();
    expect(await prizesOf(eventId)).toEqual([]);
  });

  it('refuses a confirmation without its note, and a note without a confirmation', async () => {
    const eventId = await newHackathon();
    const id = await add(eventId, {});

    await expect(
      db
        .update(hackathonPrizes)
        .set({ confirmedAt: new Date() })
        .where(eq(hackathonPrizes.id, id)),
    ).rejects.toThrow();
    await expect(
      db
        .update(hackathonPrizes)
        .set({ confirmationNote: 'Said yes on the phone.' })
        .where(eq(hackathonPrizes.id, id)),
    ).rejects.toThrow();
    expect(await listPublicHackathonPrizes(db, eventId)).toEqual([]);
  });

  it('keeps a confirmation through a change that leaves the title, value and provider, even with no value', async () => {
    const eventId = await newHackathon();
    const id = await add(eventId, { value: null });
    await confirm(id);
    const [event] = await db
      .select({ version: events.version })
      .from(events)
      .where(eq(events.id, eventId));
    const change = (prize: Partial<HackathonPrizeFields>) =>
      hackathonPrizeChange(db, {
        eventId,
        version: event?.version ?? 0,
        prizeId: id,
        prize: { ...firstPlace, value: null, ...prize },
      });

    await change({
      place: 2,
      description: 'Two years of cloud credits for the winning team.',
    });
    expect((await prizesOf(eventId))[0]).toMatchObject({
      place: 2,
      confirmationNote: 'Confirmed by email from the partner on 1 December.',
    });

    await change({ value: { amount_minor: 100, currency: 'DZD' } });
    expect((await prizesOf(eventId))[0]).toMatchObject({
      valueAmountMinor: 100,
      confirmedAt: null,
      confirmationNote: null,
    });
  });

  it('keeps a track while a prize names it, and deletes the prizes with their hackathon', async () => {
    const eventId = await newHackathon();
    const trackId = await newTrack(eventId);
    await add(eventId, { trackId });

    await expect(
      db.delete(hackathonTracks).where(eq(hackathonTracks.id, trackId)),
    ).rejects.toThrow();

    await db.delete(events).where(eq(events.id, eventId));

    expect(await prizesOf(eventId)).toEqual([]);
  });
});
