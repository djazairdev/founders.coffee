import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  hackathonCriteria,
  hackathonJudges,
  hackathonRecusals,
  hackathonScores,
  hackathonSubmissions,
  hackathonTracks,
  user,
  type Db,
} from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { hackathonDashboardResolver } from './dashboard.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { createHackathonTeamResolver } from './team-creation.js';

let db: Db;

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
    isLookingForTeam: false,
    skills: null,
  });
  if (!registered.ok) throw registered.error;
};

const teamOf = async (eventId: string, userId: string, name: string) => {
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

const entry = async (
  eventId: string,
  teamId: string,
  status: 'draft' | 'submitted',
) => {
  const trackId = id('trk');
  await db.insert(hackathonTracks).values({
    id: trackId,
    eventId,
    kind: 'founder_problem',
    title: `Track ${trackId}`,
    brief: 'Build anything that helps a founder in Algiers.',
    position: Number.parseInt(trackId.slice(-6), 16),
  });
  const submissionId = id('sub');
  await db.insert(hackathonSubmissions).values({
    id: submissionId,
    eventId,
    teamId,
    title: `Entry ${submissionId}`,
    status,
    ...(status === 'submitted'
      ? {
          trackId,
          repositoryUrl: 'https://github.com/example/entry',
          aiStatement: 'We used an assistant for tests.',
          originalWorkAttestedAt: new Date(),
          submittedAt: new Date(),
        }
      : {}),
  });
  return submissionId;
};

const judge = async (
  eventId: string,
  status: 'accepted' | 'removed' | 'invited',
) => {
  const userId = id('usr');
  await db.insert(user).values({
    id: userId,
    name: 'Judge',
    email: `${userId}@judges.test`,
  });
  const judgeId = id('jdg');
  await db.insert(hackathonJudges).values({
    id: judgeId,
    eventId,
    userId: status === 'invited' ? null : userId,
    status,
    tokenHash: id('tkh'),
    invitedBy: userId,
  });
  return judgeId;
};

describe('hackathonDashboardResolver (B-OPS-01, real D1)', () => {
  it('counts registrations, teams, entries and how far judging has come', async () => {
    const eventId = await openHackathon(db, { capacity: 3 });
    const [first, second, third, fourth] = members.map((member) => member.id);
    for (const userId of [first, second, third, fourth])
      if (userId) await register(eventId, userId);
    const teams = [];
    for (const [index, userId] of [first, second, third].entries())
      if (userId) teams.push(await teamOf(eventId, userId, `Team ${index}`));
    const [teamA, teamB, teamC] = teams as [string, string, string];
    const ledger = await entry(eventId, teamA, 'submitted');
    const clinic = await entry(eventId, teamB, 'submitted');
    await entry(eventId, teamC, 'draft');
    const criteria = [id('crt'), id('crt')];
    await db.insert(hackathonCriteria).values(
      criteria.map((criterionId, position) => ({
        id: criterionId,
        eventId,
        name: `Criterion ${position}`,
        description: 'How well the entry does on this criterion.',
        weight: 50,
        scale: 10 as const,
        position,
      })),
    );
    const scored = async (judgeId: string, submissionId: string, n: number) =>
      db.insert(hackathonScores).values(
        criteria.slice(0, n).map((criterionId) => ({
          submissionId,
          judgeId,
          criterionId,
          eventId,
          value: 7,
        })),
      );
    const amina = await judge(eventId, 'accepted');
    const karim = await judge(eventId, 'accepted');
    const gone = await judge(eventId, 'removed');
    await judge(eventId, 'invited');
    await scored(amina, ledger, 2);
    await scored(amina, clinic, 1);
    await scored(karim, ledger, 2);
    await db.insert(hackathonRecusals).values({
      judgeId: karim,
      submissionId: clinic,
      eventId,
      reason: 'I advise this team’s company.',
    });
    await scored(gone, ledger, 2);

    const dashboard = await hackathonDashboardResolver(db, eventId);

    if (!dashboard.ok) throw dashboard.error;
    expect(dashboard.data).toMatchObject({
      eventId,
      status: 'published',
      capacity: 3,
      schedule: { phase: 'registration_open' },
      counts: {
        registered: 3,
        waitlisted: 1,
        teams: 3,
        submissions: 2,
        judges: 2,
        reviewsDone: 2,
        reviewsExpected: 3,
      },
    });
  });

  it('counts nothing for a hackathon nobody has joined yet', async () => {
    const eventId = await openHackathon(db);

    const dashboard = await hackathonDashboardResolver(db, eventId);

    if (!dashboard.ok) throw dashboard.error;
    expect(dashboard.data.counts).toEqual({
      registered: 0,
      waitlisted: 0,
      teams: 0,
      submissions: 0,
      judges: 0,
      reviewsDone: 0,
      reviewsExpected: 0,
    });
    expect(dashboard.data.capacity).toBeNull();
  });

  it('answers as not found without details, and as off with hackathons off', async () => {
    const eventId = await openHackathon(db);
    expect(
      (
        await hackathonDashboardResolver(
          db,
          'evt_00000000000000000000000000000000',
        )
      ).ok,
    ).toBe(false);
    await setHackathons(db, false);
    const off = await hackathonDashboardResolver(db, eventId);
    expect(off.ok ? null : off.error.code).toBe('hackathons_disabled');
  });
});
