import { beforeEach, describe, expect, it } from 'vitest';

import type { Db } from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { createHackathonTeamResolver } from './team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
} from './team-invites.js';
import { teamPageResolver } from './team-page.js';
import { requestToJoinTeamResolver } from './team-requests.js';

let db: Db;

const [captain, teammate, asker, outsider] = members.map(
  (member) => member.id,
) as [string, string, string, string];

beforeEach(async () => {
  db = await setupDb();
  await setHackathons(db, true);
});

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

const page = async (eventId: string, userId: string, now?: number) => {
  const read = await teamPageResolver(db, { eventId, userId }, now);
  if (!read.ok) throw read.error;
  return read.data;
};

/** A hackathon with a captain's team, a teammate in it and someone asking to join. */
const withTeam = async () => {
  const eventId = await openHackathon(db, { teamMin: 2, teamMax: 4 });
  for (const userId of [captain, teammate, asker])
    await register(eventId, userId);
  const created = await createHackathonTeamResolver(db, null, {
    eventId,
    userId: captain,
    name: 'Byte Club',
    description: 'Payments for corner shops.',
    isLookingForMembers: true,
  });
  if (!created.ok) throw created.error;
  const { teamId } = created.data;
  const invite = await createTeamInviteResolver(db, {
    eventId,
    userId: captain,
  });
  if (!invite.ok) throw invite.error;
  await joinTeamByInviteResolver(db, {
    token: invite.data.token,
    userId: teammate,
  });
  const asked = await requestToJoinTeamResolver(db, {
    eventId,
    teamId,
    userId: asker,
  });
  if (!asked.ok) throw asked.error;
  return { eventId, teamId, inviteExpiresAt: invite.data.expiresAt };
};

describe('teamPageResolver (B-TEAM-07, real D1)', () => {
  it('gives the captain their team, its requests and its invite link', async () => {
    const { eventId, teamId, inviteExpiresAt } = await withTeam();

    const view = await page(eventId, captain);

    expect(view).toMatchObject({
      event: { id: eventId },
      canChangeTeams: true,
      teamMin: 2,
      teamMax: 4,
      registration: 'registered',
      team: {
        id: teamId,
        name: 'Byte Club',
        description: 'Payments for corner shops.',
        isLookingForMembers: true,
        isCaptain: true,
        members: [
          { userId: captain, name: 'Resolver Member 0', isCaptain: true },
          { userId: teammate, name: 'Resolver Member 1', isCaptain: false },
        ],
        requests: [{ userId: asker, name: 'Resolver Member 2' }],
        inviteExpiresAt,
      },
      ownRequests: [],
    });
  });

  it('keeps the requests and the link from a member who is not captain', async () => {
    const { eventId } = await withTeam();

    const view = await page(eventId, teammate);

    expect(view.team).toMatchObject({
      isCaptain: false,
      requests: [],
      inviteExpiresAt: null,
    });
    expect(view.team?.members).toHaveLength(2);
  });

  it('gives a member in no team their own requests', async () => {
    const { eventId, teamId } = await withTeam();

    const view = await page(eventId, asker);

    expect(view.team).toBeNull();
    expect(view.ownRequests).toMatchObject([{ teamId, teamName: 'Byte Club' }]);
  });

  it('says when someone is not registered, and when teams can no longer change', async () => {
    const { eventId } = await withTeam();

    expect((await page(eventId, outsider)).registration).toBeNull();
    expect(
      (await page(eventId, captain, Date.parse('2099-01-16T12:00:00Z')))
        .canChangeTeams,
    ).toBe(false);
  });

  it('answers as not found for a hackathon that is not published', async () => {
    const eventId = await openHackathon(db, {}, { status: 'draft' });

    const read = await teamPageResolver(db, { eventId, userId: captain });

    expect(read.ok ? null : read.error.code).toBe('event_not_found');
  });
});
