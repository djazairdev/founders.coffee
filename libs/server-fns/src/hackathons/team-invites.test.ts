import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  eq,
  hackathonTeamInvites,
  hackathonTeamMembers,
  hackathonTeamRequests,
  type Db,
} from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { createHackathonTeamResolver } from './team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
  revokeTeamInviteResolver,
} from './team-invites.js';

let db: Db;

const [captain, joiner, other, latecomer] = members.map(
  (member) => member.id,
) as [string, string, string, string];

const register = async (eventId: string, userId: string) => {
  const registered = await registerForHackathonResolver(db, null, {
    eventId,
    userId,
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam: true,
    skills: null,
  });
  if (!registered.ok) throw registered.error;
};

const teamOf = async (eventId: string, userId: string, name = 'Byte Club') => {
  const created = await createHackathonTeamResolver(db, null, {
    eventId,
    userId,
    name,
    description: null,
    isLookingForMembers: true,
  });
  if (!created.ok) throw created.error;
  return created.data.teamId;
};

const linkOf = async (eventId: string, userId = captain) => {
  const made = await createTeamInviteResolver(db, { eventId, userId });
  if (!made.ok) throw made.error;
  return made.data.token;
};

const join = (token: string, userId: string) =>
  joinTeamByInviteResolver(db, { token, userId });

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const membersOf = async (teamId: string) =>
  (
    await db
      .select({ userId: hackathonTeamMembers.userId })
      .from(hackathonTeamMembers)
      .where(eq(hackathonTeamMembers.teamId, teamId))
  )
    .map((row) => row.userId)
    .sort();

/** A hackathon with every member registered and the captain's team started. */
const withTeam = async (teamMax = 4) => {
  const eventId = await openHackathon(db, { teamMax });
  for (const userId of [captain, joiner, other, latecomer])
    await register(eventId, userId);
  const teamId = await teamOf(eventId, captain);
  return { eventId, teamId };
};

describe('team invite links (B-TEAM-04, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('gives the captain a seven-day link, of which only the hash is kept', async () => {
    const { eventId, teamId } = await withTeam();
    const now = Date.now();

    const made = await createTeamInviteResolver(
      db,
      { eventId, userId: captain },
      now,
    );

    if (!made.ok) throw made.error;
    expect(made.data.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(made.data.expiresAt).toBeGreaterThan(now + 6.99 * 86_400_000);
    const [row] = await db
      .select()
      .from(hackathonTeamInvites)
      .where(eq(hackathonTeamInvites.teamId, teamId));
    expect(row).toMatchObject({ createdBy: captain, revokedAt: null });
    expect(row?.tokenHash).not.toBe(made.data.token);
    expect(JSON.stringify(row)).not.toContain(made.data.token);
  });

  it('lets a registered member join through the link, once, and cancels their requests elsewhere', async () => {
    const { eventId, teamId } = await withTeam();
    const otherTeam = await teamOf(eventId, other, 'Night Owls');
    await db.insert(hackathonTeamRequests).values({
      id: id('treq'),
      teamId: otherTeam,
      eventId,
      userId: joiner,
    });
    const token = await linkOf(eventId);

    const joined = await join(token, joiner);

    expect(joined).toEqual({ ok: true, data: { eventId, teamId } });
    expect(await membersOf(teamId)).toEqual([captain, joiner].sort());
    const [request] = await db
      .select({ status: hackathonTeamRequests.status })
      .from(hackathonTeamRequests)
      .where(eq(hackathonTeamRequests.userId, joiner));
    expect(request?.status).toBe('cancelled');
    expect(codeOf(await join(token, joiner))).toBe('already_in_team');
    expect(codeOf(await join(token, other))).toBe('already_in_team');
  });

  it('refuses a full team, and gives the last place to one of two members asking at once', async () => {
    const { eventId, teamId } = await withTeam(2);
    const token = await linkOf(eventId);

    const both = await Promise.all([join(token, joiner), join(token, other)]);

    expect(both.filter((result) => result.ok)).toHaveLength(1);
    expect(both.map(codeOf).filter(Boolean)).toEqual(
      expect.arrayContaining([expect.stringMatching(/team_full/)]),
    );
    expect(codeOf(await join(token, latecomer))).toBe('team_full');
    expect(await membersOf(teamId)).toHaveLength(2);
  });

  it('stops a link once revoked, replaced or expired, and answers an unknown one the same', async () => {
    const { eventId } = await withTeam();
    const first = await linkOf(eventId);
    const second = await linkOf(eventId);

    expect(codeOf(await join(first, joiner))).toBe('team_invite_invalid');

    expect(
      await revokeTeamInviteResolver(db, { eventId, userId: captain }),
    ).toEqual({ ok: true, data: { revoked: 1 } });
    expect(codeOf(await join(second, joiner))).toBe('team_invite_invalid');

    const third = await linkOf(eventId);
    await db
      .update(hackathonTeamInvites)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(hackathonTeamInvites.createdBy, captain));
    expect(codeOf(await join(third, joiner))).toBe('team_invite_invalid');
    expect(codeOf(await join('a'.repeat(43), joiner))).toBe(
      'team_invite_invalid',
    );
  });

  it('lets only the captain share the team, and only a member with a place join it', async () => {
    const { eventId } = await withTeam();
    const token = await linkOf(eventId);
    await join(token, joiner);

    expect(
      codeOf(await createTeamInviteResolver(db, { eventId, userId: joiner })),
    ).toBe('not_team_captain');
    expect(
      codeOf(await revokeTeamInviteResolver(db, { eventId, userId: other })),
    ).toBe('not_team_captain');

    const elsewhere = await openHackathon(db);
    await register(elsewhere, captain);
    await teamOf(elsewhere, captain);
    expect(codeOf(await join(await linkOf(elsewhere), joiner))).toBe(
      'not_registered',
    );
  });

  it('shares and joins nothing once the submission deadline has passed', async () => {
    const { eventId } = await withTeam();
    const token = await linkOf(eventId);
    const later = Date.parse('2099-01-17T00:00:00Z');
    await db
      .update(hackathonTeamInvites)
      .set({ expiresAt: new Date(Date.parse('2099-02-01T00:00:00Z')) })
      .where(eq(hackathonTeamInvites.createdBy, captain));

    expect(
      codeOf(
        await createTeamInviteResolver(db, { eventId, userId: captain }, later),
      ),
    ).toBe('teams_locked');
    expect(
      codeOf(
        await joinTeamByInviteResolver(db, { token, userId: joiner }, later),
      ),
    ).toBe('teams_locked');
  });
});
