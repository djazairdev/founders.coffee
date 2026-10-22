import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { id } from '@founders-coffee/core';

import { eraseClosedAccount } from './account-closure.js';
import { person } from './account-closure.fixtures.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';
import {
  acceptHackathonJudgeInvite,
  acceptHackathonMentorInvite,
} from './index.js';
import { events, hackathonJudges, hackathonMentors, user } from './schema.js';

let db: Db;

beforeAll(async () => {
  db = await setupDb();
});

const newHackathon = async () => {
  const row = hackathonEventRow();
  await createHackathon(db, row);
  return { eventId: row.id, organiser: await person(db, 'Organiser') };
};

type Hackathon = Awaited<ReturnType<typeof newHackathon>>;

const place = (
  hackathon: Hackathon,
  values: Partial<typeof hackathonMentors.$inferInsert> = {},
) =>
  db.insert(hackathonMentors).values({
    id: id('mnt'),
    eventId: hackathon.eventId,
    tokenHash: id('tkh'),
    invitedBy: hackathon.organiser.id,
    ...values,
  });

const mentorsOf = (eventId: string) =>
  db
    .select({ userId: hackathonMentors.userId })
    .from(hackathonMentors)
    .where(eq(hackathonMentors.eventId, eventId));

describe('0065 — hackathon mentors (real D1)', () => {
  it('adds the mentors table, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration('0065_hackathon_mentors.sql');

    await apply();

    expect(await columnNames('hackathon_mentors')).toEqual([
      'id',
      'event_id',
      'user_id',
      'status',
      'token_hash',
      'invited_by',
      'helps_with',
      'office_hours',
      'responded_at',
      'created_at',
      'updated_at',
    ]);
    expect(await indexNames('hackathon_mentors')).toEqual(
      expect.arrayContaining([
        'hackathon_mentors_token_hash_unique',
        'hackathon_mentors_user_unique',
        'hackathon_mentors_user_index',
      ]),
    );
    expect(await priorEventRow(event.id)).toMatchObject({ id: event.id });
  });
});

describe('hackathon_mentors (B-HKN-25, real D1)', () => {
  it('holds an accepted mentor to an account and a line on what they help with', async () => {
    const hackathon = await newHackathon();
    const mentor = await person(db, 'Mentor');

    await expect(place(hackathon, { status: 'accepted' })).rejects.toThrow();
    await expect(
      place(hackathon, { status: 'accepted', userId: mentor.id }),
    ).rejects.toThrow();
    await place(hackathon, {
      status: 'accepted',
      userId: mentor.id,
      helpsWith: 'Pitching',
    });
    await expect(
      place(hackathon, {
        status: 'accepted',
        userId: mentor.id,
        helpsWith: 'Product',
      }),
    ).rejects.toThrow();
  });

  it('bounds what a mentor writes', async () => {
    const hackathon = await newHackathon();

    await expect(
      place(hackathon, { helpsWith: 'x'.repeat(161) }),
    ).rejects.toThrow();
    await expect(
      place(hackathon, { officeHours: 'x'.repeat(301) }),
    ).rejects.toThrow();
    await place(hackathon, {
      helpsWith: 'x'.repeat(160),
      officeHours: 'x'.repeat(300),
    });
  });

  it('erases a closed account’s mentor places with what it wrote on them', async () => {
    const hackathon = await newHackathon();
    const mentor = await person(db, 'Closing');
    await place(hackathon, {
      status: 'accepted',
      userId: mentor.id,
      helpsWith: 'Fundraising',
      officeHours: 'Tuesdays 18:00 in the chat',
    });
    await place(hackathon);
    await db
      .update(user)
      .set({ accountState: 'closing', closedAt: new Date() })
      .where(eq(user.id, mentor.id));

    await eraseClosedAccount(db, { ...mentor, phoneNumber: null });

    expect(await mentorsOf(hackathon.eventId)).toEqual([{ userId: null }]);
  });

  it('refuses, in the accepting statement, a mentor who judges the hackathon and a judge who mentors it', async () => {
    const hackathon = await newHackathon();
    const both = await person(db, 'Both');
    const judgeToken = id('tkh');
    const mentorToken = id('tkh');
    await db.insert(hackathonJudges).values({
      id: id('jdg'),
      eventId: hackathon.eventId,
      tokenHash: judgeToken,
      invitedBy: hackathon.organiser.id,
    });
    await place(hackathon, { tokenHash: mentorToken });
    const note = { helpsWith: 'Pitching', officeHours: null };

    expect(
      await acceptHackathonJudgeInvite(db, {
        tokenHash: judgeToken,
        userId: both.id,
      }),
    ).toBe(true);
    expect(
      await acceptHackathonMentorInvite(db, {
        tokenHash: mentorToken,
        userId: both.id,
        note,
      }),
    ).toBe(false);
    const other = await person(db, 'Other');
    expect(
      await acceptHackathonMentorInvite(db, {
        tokenHash: mentorToken,
        userId: other.id,
        note,
      }),
    ).toBe(true);
  });

  it('goes with its hackathon', async () => {
    const hackathon = await newHackathon();
    await place(hackathon);

    await db.delete(events).where(eq(events.id, hackathon.eventId));

    expect(await mentorsOf(hackathon.eventId)).toEqual([]);
  });
});
