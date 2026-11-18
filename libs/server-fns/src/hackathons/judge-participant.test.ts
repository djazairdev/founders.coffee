import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  acceptHackathonJudgeInvite,
  createHackathonRegistration,
  eq,
  hackathonJudges,
  hackathonRegistrations,
  hackathons as hackathonRows,
  type Db,
} from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { captain, submitted } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';

let db: Db;

const outsider = members[2]?.id ?? '';

const inviteOn = async (eventId: string): Promise<string> => {
  const tokenHash = `hash_${id('tok')}`;
  await db.insert(hackathonJudges).values({
    id: id('jdg'),
    eventId,
    tokenHash,
    status: 'invited',
    invitedBy: captain,
  });
  return tokenHash;
};

const statusOf = async (tokenHash: string) => {
  const [row] = await db
    .select({ status: hackathonJudges.status })
    .from(hackathonJudges)
    .where(eq(hackathonJudges.tokenHash, tokenHash));
  return row?.status;
};

const registering = (eventId: string, userId: string) => ({
  id: id('reg'),
  eventId,
  userId,
  attendanceMode: 'in_person' as const,
  ageAttestedAt: null,
  isLookingForTeam: false,
  skills: null,
});

describe('a judge never takes part in the hackathon they judge (B-SAFE-04, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('keeps a participant’s acceptance out even when the write is the only check left', async () => {
    const { eventId } = await submitted(db);
    const tokenHash = await inviteOn(eventId);

    expect(
      await acceptHackathonJudgeInvite(db, { tokenHash, userId: captain }),
    ).toBe(false);
    expect(await statusOf(tokenHash)).toBe('invited');
  });

  it('keeps someone on the waitlist out too, and lets in whoever withdrew or never registered', async () => {
    const { eventId } = await submitted(db);
    const waiting = registering(eventId, outsider);
    await db
      .insert(hackathonRegistrations)
      .values({ ...waiting, status: 'waitlisted' });
    const tokenHash = await inviteOn(eventId);

    expect(
      await acceptHackathonJudgeInvite(db, { tokenHash, userId: outsider }),
    ).toBe(false);

    await db
      .update(hackathonRegistrations)
      .set({ status: 'withdrawn' })
      .where(eq(hackathonRegistrations.id, waiting.id));
    expect(
      await acceptHackathonJudgeInvite(db, { tokenHash, userId: outsider }),
    ).toBe(true);
    expect(await statusOf(tokenHash)).toBe('accepted');
  });

  it('refuses a judge’s registration while registration is open', async () => {
    const { eventId } = await submitted(db);
    const tokenHash = await inviteOn(eventId);
    await acceptHackathonJudgeInvite(db, { tokenHash, userId: outsider });
    await db
      .update(hackathonRows)
      .set({
        registrationOpensAt: new Date(Date.now() - 60_000),
        registrationClosesAt: new Date(Date.now() + 60_000),
      })
      .where(eq(hackathonRows.eventId, eventId));

    expect(
      await createHackathonRegistration(db, registering(eventId, outsider)),
    ).toEqual({ outcome: 'already_judge' });
  });
});
