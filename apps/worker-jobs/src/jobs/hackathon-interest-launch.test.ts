import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  id,
  type HackathonInterestLaunchDueMessage,
} from '@founders-coffee/core';
import {
  createDb,
  eq,
  events,
  hackathonInterest,
  hackathonInterestLaunches,
  insertHackathonDetails,
  insertHackathonInterest,
  openHackathonInterestLaunch,
  seed,
  user,
  type Db,
} from '@founders-coffee/db';
import type { EmailProvider } from '@founders-coffee/email';
import type { Locale } from '@founders-coffee/i18n';

import {
  processHackathonInterestLaunch,
  sweepHackathonInterestLaunches,
  type HackathonInterestLaunchDeps,
} from './hackathon-interest-launch.js';
import { recordingEmail } from './waitlist-launch.fixtures.js';

const HOST_ID = 'usr_interest_launch_test';
const HOUR = 60 * 60 * 1000;

let db: Db;

const setup = async (): Promise<Db> => {
  const database = createDb(env.DB);
  await seed(database);
  await database.delete(hackathonInterestLaunches).run();
  await database.delete(hackathonInterest).run();
  await database.delete(events).where(eq(events.hostId, HOST_ID)).run();
  await database
    .insert(user)
    .values({ id: HOST_ID, name: 'Organiser', email: 'organiser@test.coffee' })
    .onConflictDoNothing()
    .run();
  return database;
};

const approvedHackathon = async (
  options: { opensInHours?: number; status?: 'published' | 'cancelled' } = {},
): Promise<{ slug: string; message: HackathonInterestLaunchDueMessage }> => {
  const eventId = id('evt');
  const slug = `interest-${eventId}`;
  const opensAt = Date.now() + (options.opensInHours ?? -1) * HOUR;
  await db.batch([
    db.insert(events).values({
      id: eventId,
      slug,
      hostId: HOST_ID,
      kind: 'hackathon',
      format: 'online',
      marketCode: 'DZ',
      stateCode: '16',
      cityCode: '556',
      title: 'Build & ship',
      description: 'A week to build.',
      venue: null,
      startsAt: new Date(opensAt + 20 * 24 * HOUR),
      language: 'ar',
      status: options.status ?? 'published',
    }),
    insertHackathonDetails(db, {
      eventId,
      details: {
        rules: null,
        minimumAge: null,
        attendanceModes: ['online'],
        teamMin: 1,
        teamMax: 4,
        capacity: null,
        registrationOpensAt: new Date(opensAt),
        registrationClosesAt: new Date('2099-01-20T23:00:00Z'),
        submissionDeadlineAt: new Date(opensAt + 27 * 24 * HOUR),
        judgingEndsAt: new Date(opensAt + 30 * 24 * HOUR),
        aiPolicy: 'disclosed',
        aiPolicyNote: null,
        licenceNote: null,
      },
    }),
  ]);
  const launchId = id('hil');
  await openHackathonInterestLaunch(db, {
    id: launchId,
    eventId,
    marketCode: 'DZ',
    now: new Date(),
  });
  return {
    slug,
    message: { kind: 'hackathon_interest_launch_due', launchId, eventId },
  };
};

const interested = (email: string, locale: Locale, marketCode = 'DZ') =>
  insertHackathonInterest(db, { id: id('hint'), email, marketCode, locale });

const recordingDeps = (email: EmailProvider) => {
  const requeued: { message: unknown; delaySeconds: number }[] = [];
  const deps: HackathonInterestLaunchDeps = {
    email,
    requeue: async (message, delaySeconds) => {
      requeued.push({ message, delaySeconds });
    },
  };
  return { deps, requeued };
};

const roundStatus = async (launchId: string) =>
  (
    await db
      .select()
      .from(hackathonInterestLaunches)
      .where(eq(hackathonInterestLaunches.id, launchId))
  )[0]?.status;

const entryOf = async (email: string) =>
  (
    await db
      .select()
      .from(hackathonInterest)
      .where(eq(hackathonInterest.email, email))
  )[0];

beforeEach(async () => {
  db = await setup();
});

describe('the hackathon interest notice (B-ANN-05)', () => {
  it('tells the market’s list once registration opens, each in their language, and completes the round', async () => {
    await interested('ar@interest.test', 'ar');
    await interested('fr@interest.test', 'fr');
    await interested('en@interest.test', 'en');
    await interested('cairo@interest.test', 'en', 'EG');
    const hackathon = await approvedHackathon();
    const email = recordingEmail();
    const { deps, requeued } = recordingDeps(email.provider);

    expect(
      (await processHackathonInterestLaunch(db, hackathon.message, deps)).ok,
    ).toBe(true);

    const to = (address: string) =>
      email.sent.find((message) => message.to === address);
    expect(email.sent.map((message) => message.to).sort()).toEqual([
      'ar@interest.test',
      'en@interest.test',
      'fr@interest.test',
    ]);
    expect(to('en@interest.test')?.subject).toBe(
      'Registration is open: Build & ship',
    );
    expect(to('fr@interest.test')?.subject).toBe(
      'Les inscriptions sont ouvertes : hackathon « Build & ship »',
    );
    expect(to('ar@interest.test')?.subject).toBe('التسجيل مفتوح: Build & ship');
    expect(to('en@interest.test')?.html).toContain(
      '<strong>Build &amp; ship</strong>',
    );
    expect(to('en@interest.test')?.text).toContain(
      `http://localhost:3000/en/algeria/e/${hackathon.slug}`,
    );
    expect(to('ar@interest.test')?.text).toContain(
      `http://localhost:3000/ar/algeria/e/${hackathon.slug}`,
    );
    expect(to('en@interest.test')?.text).toContain('Jan 21');
    expect((await entryOf('ar@interest.test'))?.notifiedAt).toBeInstanceOf(
      Date,
    );
    expect((await entryOf('cairo@interest.test'))?.notifiedAt).toBeNull();
    expect(await roundStatus(hackathon.message.launchId)).toBe('completed');
    expect(requeued).toHaveLength(0);

    await processHackathonInterestLaunch(db, hackathon.message, deps);
    expect(email.sent).toHaveLength(3);
  });

  it('sends nothing before registration opens, and the sweep sends it once it has', async () => {
    await interested('early@interest.test', 'en');
    const later = await approvedHackathon({ opensInHours: 2 });
    const email = recordingEmail();
    const { deps } = recordingDeps(email.provider);

    await processHackathonInterestLaunch(db, later.message, deps);
    await sweepHackathonInterestLaunches(db, deps);
    expect(email.sent).toHaveLength(0);
    expect(await roundStatus(later.message.launchId)).toBe('pending');

    await db
      .update(hackathonInterestLaunches)
      .set({ status: 'cancelled' })
      .where(eq(hackathonInterestLaunches.id, later.message.launchId));
    const opened = await approvedHackathon();
    await sweepHackathonInterestLaunches(db, deps);
    expect(email.sent.map((message) => message.to)).toEqual([
      'early@interest.test',
    ]);
    expect(await roundStatus(opened.message.launchId)).toBe('completed');
  });

  it('withdraws the round of a hackathon that was cancelled, leaving the list waiting', async () => {
    await interested('waiting@interest.test', 'fr');
    const cancelled = await approvedHackathon({ status: 'cancelled' });
    const email = recordingEmail();

    await processHackathonInterestLaunch(
      db,
      cancelled.message,
      recordingDeps(email.provider).deps,
    );

    expect(email.sent).toHaveLength(0);
    expect(await roundStatus(cancelled.message.launchId)).toBe('cancelled');
    expect((await entryOf('waiting@interest.test'))?.notifiedAt).toBeNull();
  });

  it('retries a refused address after a pause, and gives up on it after three attempts', async () => {
    await interested('refused@interest.test', 'en');
    await interested('fine@interest.test', 'en');
    const hackathon = await approvedHackathon();
    const email = recordingEmail(['refused@interest.test']);
    const { deps, requeued } = recordingDeps(email.provider);

    await processHackathonInterestLaunch(db, hackathon.message, deps);
    expect(email.sent.map((message) => message.to)).toEqual([
      'fine@interest.test',
    ]);
    expect(await entryOf('refused@interest.test')).toMatchObject({
      notifiedAt: null,
      sendAttempts: 1,
      lastError: 'mailbox unavailable',
    });
    expect(requeued).toEqual([
      { message: hackathon.message, delaySeconds: 300 },
    ]);

    await processHackathonInterestLaunch(db, hackathon.message, deps);
    await processHackathonInterestLaunch(db, hackathon.message, deps);
    const given = await entryOf('refused@interest.test');
    expect(given?.sendAttempts).toBe(3);
    expect(given?.notifiedAt).toBeInstanceOf(Date);
    expect(await roundStatus(hackathon.message.launchId)).toBe('completed');
  });

  it('hands a long list back to the queue in batches of fifty', async () => {
    for (let index = 0; index < 51; index += 1)
      await interested(`person${index}@interest.test`, 'ar');
    const hackathon = await approvedHackathon();
    const email = recordingEmail();
    const { deps, requeued } = recordingDeps(email.provider);

    await processHackathonInterestLaunch(db, hackathon.message, deps);
    expect(email.sent).toHaveLength(50);
    expect(requeued).toEqual([{ message: hackathon.message, delaySeconds: 0 }]);

    await processHackathonInterestLaunch(db, hackathon.message, deps);
    expect(email.sent).toHaveLength(51);
    expect(await roundStatus(hackathon.message.launchId)).toBe('completed');
  });
});
