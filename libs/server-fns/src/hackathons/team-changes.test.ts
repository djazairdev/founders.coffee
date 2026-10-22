import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  hackathonTeamInvites,
  hackathonTeamMembers,
  hackathonTeams,
  type Db,
} from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import {
  leaveTeamResolver,
  passCaptaincyResolver,
  removeTeamMemberResolver,
} from './team-changes.js';
import { createHackathonTeamResolver } from './team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
} from './team-invites.js';

let db: Db;

const [captain, second, third, outsider] = members.map(
  (member) => member.id,
) as [string, string, string, string];

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

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

/** A hackathon whose captain's team has `size` members, everyone registered. */
const withTeam = async (size: number) => {
  const eventId = await openHackathon(db);
  for (const userId of [captain, second, third, outsider])
    await register(eventId, userId);
  const created = await createHackathonTeamResolver(db, null, {
    eventId,
    userId: captain,
    name: 'Byte Club',
    description: null,
    isLookingForMembers: true,
  });
  if (!created.ok) throw created.error;
  const link = await createTeamInviteResolver(db, { eventId, userId: captain });
  if (!link.ok) throw link.error;
  for (const userId of [second, third].slice(0, size - 1)) {
    const joined = await joinTeamByInviteResolver(db, {
      token: link.data.token,
      userId,
    });
    if (!joined.ok) throw joined.error;
  }
  return { eventId, teamId: created.data.teamId };
};

const rosterOf = async (teamId: string) =>
  (
    await db
      .select({
        userId: hackathonTeamMembers.userId,
        isCaptain: hackathonTeamMembers.isCaptain,
      })
      .from(hackathonTeamMembers)
      .where(eq(hackathonTeamMembers.teamId, teamId))
  ).sort((a, b) => a.userId.localeCompare(b.userId));

const teamExists = async (teamId: string) =>
  (await db.select().from(hackathonTeams).where(eq(hackathonTeams.id, teamId)))
    .length === 1;

describe('leaving and changing a team (B-TEAM-06, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('lets a member leave, and keeps the captain until they pass the captaincy on', async () => {
    const { eventId, teamId } = await withTeam(3);

    expect(await leaveTeamResolver(db, { eventId, userId: third })).toEqual({
      ok: true,
      data: { isTeamDeleted: false },
    });
    expect(
      codeOf(await leaveTeamResolver(db, { eventId, userId: captain })),
    ).toBe('captain_must_transfer');
    expect(
      codeOf(await leaveTeamResolver(db, { eventId, userId: outsider })),
    ).toBe('not_team_member');

    expect(
      await passCaptaincyResolver(db, {
        eventId,
        userId: captain,
        memberId: second,
      }),
    ).toEqual({ ok: true, data: true });
    expect(await leaveTeamResolver(db, { eventId, userId: captain })).toEqual({
      ok: true,
      data: { isTeamDeleted: false },
    });
    expect(await rosterOf(teamId)).toEqual([
      { userId: second, isCaptain: true },
    ]);
  });

  it('deletes the team, with its links, when its last member leaves', async () => {
    const { eventId, teamId } = await withTeam(1);

    expect(await leaveTeamResolver(db, { eventId, userId: captain })).toEqual({
      ok: true,
      data: { isTeamDeleted: true },
    });
    expect(await teamExists(teamId)).toBe(false);
    expect(
      await db
        .select()
        .from(hackathonTeamInvites)
        .where(eq(hackathonTeamInvites.teamId, teamId)),
    ).toEqual([]);
  });

  it('passes the captaincy only to another member of the same team', async () => {
    const { eventId, teamId } = await withTeam(2);

    for (const [userId, memberId, code] of [
      [second, captain, 'not_team_captain'],
      [captain, captain, 'not_team_member'],
      [captain, outsider, 'not_team_member'],
    ] as const)
      expect(
        codeOf(await passCaptaincyResolver(db, { eventId, userId, memberId })),
      ).toBe(code);
    expect(await rosterOf(teamId)).toEqual(
      [
        { userId: captain, isCaptain: true },
        { userId: second, isCaptain: false },
      ].sort((a, b) => a.userId.localeCompare(b.userId)),
    );
  });

  it('lets the captain remove another member, and nobody else remove anyone', async () => {
    const { eventId, teamId } = await withTeam(3);

    expect(
      codeOf(
        await removeTeamMemberResolver(db, {
          eventId,
          userId: second,
          memberId: third,
        }),
      ),
    ).toBe('not_team_captain');
    expect(
      codeOf(
        await removeTeamMemberResolver(db, {
          eventId,
          userId: captain,
          memberId: captain,
        }),
      ),
    ).toBe('not_team_member');
    expect(
      await removeTeamMemberResolver(db, {
        eventId,
        userId: captain,
        memberId: third,
      }),
    ).toEqual({ ok: true, data: true });
    expect((await rosterOf(teamId)).map((row) => row.userId).sort()).toEqual(
      [captain, second].sort(),
    );
  });

  it('changes nothing once the submission deadline has passed', async () => {
    const { eventId, teamId } = await withTeam(2);
    const later = Date.parse('2099-01-17T00:00:00Z');

    expect(
      codeOf(await leaveTeamResolver(db, { eventId, userId: second }, later)),
    ).toBe('teams_locked');
    expect(
      codeOf(
        await removeTeamMemberResolver(
          db,
          { eventId, userId: captain, memberId: second },
          later,
        ),
      ),
    ).toBe('teams_locked');
    expect(await rosterOf(teamId)).toHaveLength(2);
  });
});
