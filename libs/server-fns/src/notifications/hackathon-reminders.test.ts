import { inArray } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  and,
  eq,
  events,
  getHackathon,
  hackathons as hackathonTable,
  scheduledNotifications,
  user,
  type Db,
} from '@founders-coffee/db';
import {
  HACKATHON_REMINDER_KEYS,
  type HackathonReminderKey,
} from '@founders-coffee/core';

import { TEST_HOST_ID } from '../events/resolver.fixtures.js';
import { announceUpdate } from '../events/update-notices.js';
import { saveHackathonDetailsResolver } from '../hackathons/details.js';
import {
  DAY,
  detailsFor,
  hackathonWithDetails,
  HOUR,
  ORGANISATION,
  setupHackathonDb,
} from '../hackathons/edit.fixtures.js';
import {
  openHackathon,
  setHackathons,
} from '../hackathons/registration.fixtures.js';
import { registerForHackathonResolver } from '../hackathons/registration.js';
import { withdrawFromHackathonResolver } from '../hackathons/withdrawal.js';
import { HOST_ID, members, setupDb } from '../rsvps/resolver.fixtures.js';
import {
  moveHackathonReminders,
  scheduleOrganiserReminders,
  scheduleParticipantReminders,
} from './hackathon-reminders.js';

let db: Db;

const [first, second] = members.map((member) => member.id) as [string, string];

const register = (eventId: string, userId: string) =>
  registerForHackathonResolver(db, null, {
    eventId,
    userId,
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam: false,
    skills: null,
  });

const remindersOf = async (
  eventId: string,
  userId: string,
  status: 'pending' | 'cancelled' = 'pending',
) =>
  (
    await db
      .select({
        templateKey: scheduledNotifications.templateKey,
        sendAt: scheduledNotifications.sendAt,
        payload: scheduledNotifications.payload,
      })
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.eventId, eventId),
          eq(scheduledNotifications.userId, userId),
          eq(scheduledNotifications.status, status),
          inArray(scheduledNotifications.templateKey, [
            ...HACKATHON_REMINDER_KEYS,
          ]),
        ),
      )
  ).sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime());

const timesOf = (rows: Awaited<ReturnType<typeof remindersOf>>) =>
  rows.map((row) => [
    row.templateKey as HackathonReminderKey,
    row.sendAt.toISOString(),
  ]);

describe('hackathon reminders (B-HKN-21, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('reminds a registered member of kickoff and the deadline, in their language', async () => {
    const eventId = await openHackathon(db);
    await db.update(user).set({ localePref: 'ar' }).where(eq(user.id, first));
    await register(eventId, first);

    const rows = await remindersOf(eventId, first);
    expect(timesOf(rows)).toEqual([
      ['hackathon_deadline_24h', '2099-01-15T12:00:00.000Z'],
      ['hackathon_kickoff', '2099-01-15T17:00:00.000Z'],
      ['hackathon_deadline_1h', '2099-01-16T11:00:00.000Z'],
    ]);
    expect(rows[1]?.payload).toMatchObject({
      locale: 'ar',
      pushTitle: expect.stringContaining('بعد ساعة'),
      subject: expect.any(String),
      pushUrl: expect.stringMatching(/\/ar\/algeria\/e\/resolver-rsvp-/u),
    });
  });

  it('gives a waitlisted member none until promoted, and withdraws them with the place', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });
    await register(eventId, first);
    await register(eventId, second);
    expect(await remindersOf(eventId, second)).toEqual([]);

    await withdrawFromHackathonResolver(db, null, { eventId, userId: first });

    expect(await remindersOf(eventId, first)).toEqual([]);
    expect(await remindersOf(eventId, first, 'cancelled')).toHaveLength(3);
    expect(await remindersOf(eventId, second)).toHaveLength(3);
  });

  it('never doubles a member’s reminders when they are scheduled again', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await scheduleParticipantReminders(db, { eventId, userId: first });

    expect(await remindersOf(eventId, first)).toHaveLength(3);
  });

  it('reminds the organisers that registration closes and judging opens, once', async () => {
    const eventId = await openHackathon(db);
    await scheduleOrganiserReminders(db, eventId);
    await scheduleOrganiserReminders(db, eventId);

    expect(timesOf(await remindersOf(eventId, HOST_ID))).toEqual([
      ['hackathon_registration_closing', '2099-01-09T18:00:00.000Z'],
      ['hackathon_judging_open', '2099-01-16T12:00:00.000Z'],
    ]);
  });

  it('schedules nothing for a hackathon not published, nor a moment already past', async () => {
    const draft = await openHackathon(db, {}, { status: 'draft' });
    await scheduleOrganiserReminders(db, draft);
    expect(await remindersOf(draft, HOST_ID)).toEqual([]);

    const closing = await openHackathon(db, {
      registrationClosesAt: new Date(Date.now() + HOUR),
    });
    await scheduleOrganiserReminders(db, closing);
    expect(timesOf(await remindersOf(closing, HOST_ID))).toEqual([
      ['hackathon_judging_open', '2099-01-16T12:00:00.000Z'],
    ]);
  });

  it('moves pending reminders with the dates, and cancels one whose time has passed', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await scheduleOrganiserReminders(db, eventId);
    await db
      .update(hackathonTable)
      .set({
        registrationClosesAt: new Date(Date.now() + HOUR),
        submissionDeadlineAt: new Date('2099-01-16T15:00:00Z'),
      })
      .where(eq(hackathonTable.eventId, eventId));

    await moveHackathonReminders(db, eventId);

    expect(timesOf(await remindersOf(eventId, HOST_ID))).toEqual([
      ['hackathon_judging_open', '2099-01-16T15:00:00.000Z'],
    ]);
    expect(
      (await remindersOf(eventId, HOST_ID, 'cancelled')).map(
        (row) => row.templateKey,
      ),
    ).toEqual(['hackathon_registration_closing']);
    expect(timesOf(await remindersOf(eventId, first))).toEqual([
      ['hackathon_deadline_24h', '2099-01-15T15:00:00.000Z'],
      ['hackathon_kickoff', '2099-01-15T17:00:00.000Z'],
      ['hackathon_deadline_1h', '2099-01-16T14:00:00.000Z'],
    ]);
  });

  it('moves the kickoff reminder when the event’s start moves', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    const before = (await getHackathon(db, eventId))?.event;
    if (!before) throw new Error('hackathon missing');
    await db
      .update(events)
      .set({ startsAt: new Date('2099-01-15T10:00:00Z') })
      .where(eq(events.id, eventId));
    const after = (await getHackathon(db, eventId))?.event;
    if (!after) throw new Error('hackathon missing');

    await announceUpdate(db, { before, after, notice: null });

    expect(timesOf(await remindersOf(eventId, first))).toContainEqual([
      'hackathon_kickoff',
      '2099-01-15T09:00:00.000Z',
    ]);
  });
});

describe('hackathon reminders after a details save (B-HKN-21, real D1)', () => {
  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  it('moves the organisers’ reminders to the saved dates', async () => {
    const { eventId, kickoff, version } = await hackathonWithDetails(
      db,
      {},
      true,
    );
    await scheduleOrganiserReminders(db, eventId);

    const saved = await saveHackathonDetailsResolver(db, {
      eventId,
      version,
      organisationId: ORGANISATION,
      details: detailsFor(kickoff, {
        registrationClosesAt: kickoff - 2 * DAY,
        submissionDeadlineAt: kickoff + 2 * DAY - 2 * HOUR,
      }),
    });
    if (!saved.ok) throw saved.error;

    expect(timesOf(await remindersOf(eventId, TEST_HOST_ID))).toEqual([
      [
        'hackathon_registration_closing',
        new Date(kickoff - 3 * DAY).toISOString(),
      ],
      [
        'hackathon_judging_open',
        new Date(kickoff + 2 * DAY - 2 * HOUR).toISOString(),
      ],
    ]);
  });
});
