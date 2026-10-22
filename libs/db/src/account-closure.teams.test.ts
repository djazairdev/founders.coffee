import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';

import { eraseClosedAccount } from './account-closure.js';
import { person } from './account-closure.fixtures.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import { join, newTeam, register } from './hackathon-teams.fixtures.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import {
  hackathonTeamInvites,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
  user,
} from './schema.js';

const close = async (db: Db, closing: { id: string; email: string }) => {
  await db
    .update(user)
    .set({ accountState: 'closing', closedAt: new Date() })
    .where(eq(user.id, closing.id));
  return eraseClosedAccount(db, { ...closing, phoneNumber: null });
};

const membersOf = (db: Db, teamId: string) =>
  db
    .select({
      userId: hackathonTeamMembers.userId,
      isCaptain: hackathonTeamMembers.isCaptain,
    })
    .from(hackathonTeamMembers)
    .where(eq(hackathonTeamMembers.teamId, teamId));

const teamExists = async (db: Db, teamId: string) =>
  (await db.select().from(hackathonTeams).where(eq(hackathonTeams.id, teamId)))
    .length === 1;

describe('account closure and hackathon teams (real D1, B-TEAM-01)', () => {
  it('passes a captained team to the earliest member left, and deletes one left empty', async () => {
    const db = await setupDb();
    const event = hackathonEventRow();
    await createHackathon(db, event);
    const [captain, early, late, other] = await Promise.all(
      ['Leaving', 'Early', 'Late', 'Other'].map((name) => person(db, name)),
    );
    for (const someone of [captain, early, late, other])
      await register(db, event.id, someone.id);
    const shared = {
      eventId: event.id,
      teamId: await newTeam(db, event.id, 'Shared'),
    };
    const solo = {
      eventId: event.id,
      teamId: await newTeam(db, event.id, 'Solo'),
    };
    const untouched = {
      eventId: event.id,
      teamId: await newTeam(db, event.id, 'Untouched'),
    };
    await join(db, shared, captain.id, {
      isCaptain: true,
      joinedAt: new Date('2099-01-06T09:00:00Z'),
    });
    await join(db, shared, late.id, {
      joinedAt: new Date('2099-01-08T09:00:00Z'),
    });
    await join(db, shared, early.id, {
      joinedAt: new Date('2099-01-07T09:00:00Z'),
    });
    await join(db, untouched, other.id, { isCaptain: true });
    const lone = await person(db, 'Lone');
    await register(db, event.id, lone.id);
    await db.insert(hackathonTeamInvites).values({
      id: id('tinv'),
      teamId: shared.teamId,
      tokenHash: `hash-${shared.teamId}`,
      createdBy: captain.id,
      expiresAt: new Date('2099-01-12T09:00:00Z'),
    });
    await join(db, solo, lone.id, { isCaptain: true });
    await db.insert(hackathonTeamRequests).values({
      id: id('treq'),
      ...untouched,
      userId: captain.id,
    });

    expect(await close(db, captain)).toBe(true);
    expect(await close(db, lone)).toBe(true);

    expect(await membersOf(db, shared.teamId)).toEqual(
      expect.arrayContaining([
        { userId: early.id, isCaptain: true },
        { userId: late.id, isCaptain: false },
      ]),
    );
    expect(await membersOf(db, shared.teamId)).toHaveLength(2);
    expect(await teamExists(db, solo.teamId)).toBe(false);
    expect(await membersOf(db, untouched.teamId)).toEqual([
      { userId: other.id, isCaptain: true },
    ]);
    expect(
      await db
        .select()
        .from(hackathonTeamRequests)
        .where(eq(hackathonTeamRequests.userId, captain.id)),
    ).toEqual([]);
    expect(
      await db
        .select({ createdBy: hackathonTeamInvites.createdBy })
        .from(hackathonTeamInvites)
        .where(eq(hackathonTeamInvites.teamId, shared.teamId)),
      'an invite link belongs to its team and stays, from the tombstone',
    ).toEqual([{ createdBy: captain.id }]);
  });

  it('takes a plain member out of their team and leaves its captain', async () => {
    const db = await setupDb();
    const event = hackathonEventRow();
    await createHackathon(db, event);
    const captain = await person(db, 'Captain');
    const leaving = await person(db, 'Plain');
    await register(db, event.id, captain.id);
    await register(db, event.id, leaving.id);
    const team = {
      eventId: event.id,
      teamId: await newTeam(db, event.id, 'Crew'),
    };
    await join(db, team, captain.id, { isCaptain: true });
    await join(db, team, leaving.id);

    expect(await close(db, leaving)).toBe(true);

    expect(await membersOf(db, team.teamId)).toEqual([
      { userId: captain.id, isCaptain: true },
    ]);
  });
});
