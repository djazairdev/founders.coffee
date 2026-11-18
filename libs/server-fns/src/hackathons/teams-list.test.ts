import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  hackathonSubmissions,
  hackathonTracks,
  listHackathonTeams,
  type Db,
} from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { hackathonTeamsResolver } from './participants.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { createHackathonTeamResolver } from './team-creation.js';

let db: Db;

beforeEach(async () => {
  db = await setupDb();
  await setHackathons(db, true);
});

const [first = '', second = ''] = members.map((member) => member.id);

const teamOf = async (eventId: string, userId: string, name: string) => {
  const registered = await registerForHackathonResolver(db, null, {
    eventId,
    userId,
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam: false,
    skills: null,
  });
  if (!registered.ok) throw registered.error;
  const created = await createHackathonTeamResolver(db, null, {
    eventId,
    userId,
    name,
    description: null,
    isLookingForMembers: false,
  });
  if (!created.ok) throw created.error;
  return created.data.teamId;
};

describe('hackathonTeamsResolver (B-OPS-02, real D1)', () => {
  it('lists each team with its members, track and entry', async () => {
    const eventId = await openHackathon(db);
    const withEntry = await teamOf(eventId, first, 'Byte Club');
    await teamOf(eventId, second, 'Copper Crew');
    const trackId = id('trk');
    await db.insert(hackathonTracks).values({
      id: trackId,
      eventId,
      kind: 'founder_problem',
      title: 'Payments',
      brief: 'Build anything that helps a founder in Algiers.',
      position: 0,
    });
    await db.insert(hackathonSubmissions).values({
      id: id('sub'),
      eventId,
      teamId: withEntry,
      trackId,
      title: 'Ledger',
      status: 'submitted',
      repositoryUrl: 'https://github.com/example/entry',
      aiStatement: 'We used an assistant for tests.',
      originalWorkAttestedAt: new Date(),
      submittedAt: new Date(),
    });

    const result = await hackathonTeamsResolver(db, eventId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byName = new Map(result.data.teams.map((team) => [team.name, team]));
    expect(byName.get('Byte Club')).toMatchObject({
      trackTitle: 'Payments',
      submissionStatus: 'submitted',
      members: [{ userId: first, isCaptain: true }],
    });
    expect(byName.get('Copper Crew')).toMatchObject({
      trackTitle: null,
      submissionStatus: null,
      members: [{ userId: second, isCaptain: true }],
    });
    expect(JSON.stringify(result.data)).not.toContain('@');
  });

  it('says when the list stops short', async () => {
    const eventId = await openHackathon(db);
    await teamOf(eventId, first, 'Byte Club');
    await teamOf(eventId, second, 'Copper Crew');

    const shown = await listHackathonTeams(db, eventId, 1);

    expect(shown.teams).toHaveLength(1);
    expect(shown.isTruncated).toBe(true);
  });

  it('answers as off with hackathons off, and as not found for no hackathon', async () => {
    const eventId = await openHackathon(db);
    await setHackathons(db, false);

    const off = await hackathonTeamsResolver(db, eventId);
    expect(off.ok).toBe(false);

    await setHackathons(db, true);
    const missing = await hackathonTeamsResolver(db, 'evt_missing');
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('event_not_found');
  });
});
