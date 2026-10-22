import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { id } from '@founders-coffee/core';

import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import {
  cancelHackathonInterestLaunch,
  claimHackathonInterest,
  completeHackathonInterestLaunchIfDrained,
  listDueHackathonInterestLaunches,
  openHackathonInterestLaunch,
  releaseHackathonInterest,
} from './hackathon-interest-launch.js';
import { insertHackathonInterest } from './hackathon-interest.js';
import {
  createHackathon,
  hackathonDetails,
  hackathonEventRow,
} from './hackathons.fixtures.js';
import {
  events,
  hackathonInterest,
  hackathonInterestLaunches,
} from './schema.js';

let db: Db;

const OPENED = new Date('2099-01-05T09:00:00Z');

const newHackathon = async (marketCode: 'DZ' | 'EG' = 'DZ') => {
  const row = { ...hackathonEventRow(), marketCode };
  await createHackathon(db, row);
  return row.id;
};

const open = (eventId: string, marketCode = 'DZ') =>
  openHackathonInterestLaunch(db, {
    id: id('hil'),
    eventId,
    marketCode,
    now: new Date(),
  });

const interested = async (email: string, marketCode = 'DZ') => {
  const entryId = id('hint');
  await insertHackathonInterest(db, {
    id: entryId,
    email,
    marketCode,
    locale: 'fr',
  });
  return entryId;
};

const launchOf = async (eventId: string) =>
  (
    await db
      .select()
      .from(hackathonInterestLaunches)
      .where(eq(hackathonInterestLaunches.eventId, eventId))
  )[0];

const entry = async (entryId: string) =>
  (
    await db
      .select()
      .from(hackathonInterest)
      .where(eq(hackathonInterest.id, entryId))
  )[0];

beforeEach(async () => {
  db = await setupDb();
  await db.delete(hackathonInterestLaunches).run();
  await db.delete(hackathonInterest).run();
});

describe('the hackathon interest round (B-ANN-05, real D1)', () => {
  it('owes each market one round, to its first hackathon, until that one is withdrawn', async () => {
    const first = await newHackathon();
    const second = await newHackathon();
    const cairo = await newHackathon('EG');

    expect(await open(first)).toEqual({ written: true });
    expect(await open(second)).toEqual({ written: false });
    expect(await open(cairo, 'EG')).toEqual({ written: true });

    const round = await launchOf(first);
    await cancelHackathonInterestLaunch(db, round?.id ?? '', new Date());
    expect((await launchOf(first))?.status).toBe('cancelled');
    expect(await open(second)).toEqual({ written: true });
  });

  it('withdraws a pending round whose hackathon was cancelled when the next one is approved', async () => {
    const cancelled = await newHackathon();
    await open(cancelled);
    await db
      .update(events)
      .set({ status: 'cancelled' })
      .where(eq(events.id, cancelled));
    const next = await newHackathon();

    expect(await open(next)).toEqual({ written: true });
    expect((await launchOf(cancelled))?.status).toBe('cancelled');
    expect((await launchOf(next))?.status).toBe('pending');
  });

  it('lists a pending round only once its hackathon has opened registration', async () => {
    const eventId = await newHackathon();
    await open(eventId);
    const before = new Date(
      hackathonDetails.registrationOpensAt.getTime() - 1000,
    );

    expect(
      await listDueHackathonInterestLaunches(db, { now: before, limit: 5 }),
    ).toEqual([]);
    expect(
      (
        await listDueHackathonInterestLaunches(db, { now: OPENED, limit: 5 })
      ).map((round) => round.eventId),
    ).toEqual([eventId]);
  });

  it('claims a market’s waiting addresses oldest first, once each, and counts the attempt', async () => {
    const firstId = await interested('first@interest.test');
    await interested('second@interest.test');
    await interested('third@interest.test');
    await interested('cairo@interest.test', 'EG');

    const batch = await claimHackathonInterest(db, {
      marketCode: 'DZ',
      now: OPENED,
      limit: 2,
    });
    const rest = await claimHackathonInterest(db, {
      marketCode: 'DZ',
      now: OPENED,
      limit: 2,
    });

    expect(batch.map((row) => row.email)).toEqual([
      'first@interest.test',
      'second@interest.test',
    ]);
    expect(rest.map((row) => row.email)).toEqual(['third@interest.test']);
    expect(batch[0]).toMatchObject({ locale: 'fr', sendAttempts: 1 });
    expect((await entry(firstId))?.notifiedAt).toEqual(OPENED);
    expect(
      await claimHackathonInterest(db, {
        marketCode: 'DZ',
        now: OPENED,
        limit: 2,
      }),
    ).toEqual([]);
  });

  it('puts a failed address back to wait, and keeps the mark on one given up on', async () => {
    const retried = await interested('retry@interest.test');
    const given = await interested('given@interest.test');
    await claimHackathonInterest(db, {
      marketCode: 'DZ',
      now: OPENED,
      limit: 5,
    });

    await releaseHackathonInterest(db, {
      id: retried,
      error: 'mailbox unavailable',
      isFinal: false,
    });
    await releaseHackathonInterest(db, {
      id: given,
      error: 'mailbox unavailable',
      isFinal: true,
    });

    expect(await entry(retried)).toMatchObject({
      notifiedAt: null,
      sendAttempts: 1,
      lastError: 'mailbox unavailable',
    });
    expect(await entry(given)).toMatchObject({
      notifiedAt: OPENED,
      lastError: 'mailbox unavailable',
    });
  });

  it('completes a round only once nobody in its market is still waiting', async () => {
    const eventId = await newHackathon();
    await open(eventId);
    const round = await launchOf(eventId);
    const launch = { id: round?.id ?? '', marketCode: 'DZ' };
    await interested('waiting@interest.test');
    await interested('cairo@interest.test', 'EG');

    expect(
      await completeHackathonInterestLaunchIfDrained(db, launch, OPENED),
    ).toBe(false);
    await claimHackathonInterest(db, {
      marketCode: 'DZ',
      now: OPENED,
      limit: 5,
    });
    expect(
      await completeHackathonInterestLaunchIfDrained(db, launch, OPENED),
    ).toBe(true);
    expect(await launchOf(eventId)).toMatchObject({
      status: 'completed',
      completedAt: OPENED,
    });
  });
});
