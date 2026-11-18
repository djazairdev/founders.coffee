import { beforeEach, describe, expect, it } from 'vitest';

import { readLookingForTeam, type Db } from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { lookingForTeamResolver } from './looking.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { createHackathonTeamResolver } from './team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
} from './team-invites.js';
import { requestToJoinTeamResolver } from './team-requests.js';

let db: Db;

const [first, second, third, fourth] = members.map((member) => member.id) as [
  string,
  string,
  string,
  string,
];

beforeEach(async () => {
  db = await setupDb();
  await setHackathons(db, true);
});

const register = async (
  eventId: string,
  userId: string,
  isLookingForTeam = true,
  skills: string | null = null,
) => {
  const registered = await registerForHackathonResolver(db, null, {
    eventId,
    userId,
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam,
    skills,
  });
  if (!registered.ok) throw registered.error;
};

const startTeam = async (
  eventId: string,
  userId: string,
  name: string,
  isLookingForMembers = true,
) => {
  const created = await createHackathonTeamResolver(db, null, {
    eventId,
    userId,
    name,
    description: null,
    isLookingForMembers,
  });
  if (!created.ok) throw created.error;
  return created.data.teamId;
};

const view = async (eventId: string, userId: string, now?: number) => {
  const read = await lookingForTeamResolver(db, { eventId, userId }, now);
  if (!read.ok) throw read.error;
  return read.data;
};

describe('lookingForTeamResolver (B-TEAM-08, real D1)', () => {
  it('lists the teams with room and the participants looking, to a registered participant', async () => {
    const eventId = await openHackathon(db, { teamMax: 4 });
    await register(eventId, first);
    await register(eventId, second, true, 'Design, React');
    await register(eventId, third, false);
    await register(eventId, fourth);
    const teamId = await startTeam(eventId, first, 'Byte Club');
    await startTeam(eventId, fourth, 'Quiet Ones', false);

    const before = await view(eventId, third);

    expect(before).toMatchObject({
      event: { id: eventId },
      canChangeTeams: true,
      teamMax: 4,
      registration: 'registered',
      isInTeam: false,
      teams: [{ id: teamId, name: 'Byte Club', size: 1, isRequested: false }],
      hasMoreTeams: false,
      participants: [
        { userId: second, name: 'Resolver Member 1', skills: 'Design, React' },
      ],
      hasMoreParticipants: false,
      listLimit: 100,
    });

    const asked = await requestToJoinTeamResolver(db, {
      eventId,
      teamId,
      userId: third,
    });
    if (!asked.ok) throw asked.error;

    expect((await view(eventId, third)).teams).toMatchObject([
      { id: teamId, isRequested: true },
    ]);
  });

  it('leaves out full teams and the viewer’s own', async () => {
    const eventId = await openHackathon(db, { teamMax: 2 });
    for (const userId of [first, second, third, fourth])
      await register(eventId, userId);
    await startTeam(eventId, first, 'Byte Club');
    const invite = await createTeamInviteResolver(db, {
      eventId,
      userId: first,
    });
    if (!invite.ok) throw invite.error;
    await joinTeamByInviteResolver(db, {
      token: invite.data.token,
      userId: second,
    });
    const soloId = await startTeam(eventId, fourth, 'Solo');

    expect((await view(eventId, third)).teams).toMatchObject([{ id: soloId }]);
    const own = await view(eventId, fourth);
    expect(own).toMatchObject({ isInTeam: true, teams: [] });
    expect(own.participants.map((person) => person.userId)).toEqual([third]);
  });

  it('lists nobody to someone who is not registered or still waitlisted', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });
    await register(eventId, first);
    await register(eventId, second);
    await startTeam(eventId, first, 'Byte Club');

    expect(await view(eventId, second)).toMatchObject({
      registration: 'waitlisted',
      teams: [],
      participants: [],
    });
    expect(await view(eventId, third)).toMatchObject({
      registration: null,
      teams: [],
      participants: [],
    });
  });

  it('says when teams can no longer change', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);

    expect(
      (await view(eventId, first, Date.parse('2099-01-16T12:00:00Z')))
        .canChangeTeams,
    ).toBe(false);
  });

  it('caps each list and says when there are more', async () => {
    const eventId = await openHackathon(db, { teamMax: 4 });
    for (const userId of [first, second, third, fourth])
      await register(eventId, userId);
    await startTeam(eventId, first, 'Byte Club');
    await startTeam(eventId, second, 'Solo');

    const read = await readLookingForTeam(db, {
      eventId,
      userId: fourth,
      teamMax: 4,
      limit: 1,
    });

    expect(read.teams).toHaveLength(1);
    expect(read.hasMoreTeams).toBe(true);
    expect(read.participants.map((person) => person.userId)).toEqual([third]);
    expect(read.hasMoreParticipants).toBe(false);
  });
});
