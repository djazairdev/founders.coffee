import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  hackathonTeamMembers,
  hackathonTeamRequests,
  type Db,
} from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { createHackathonTeamResolver } from './team-creation.js';
import {
  answerTeamRequestResolver,
  cancelTeamRequestResolver,
  requestToJoinTeamResolver,
} from './team-requests.js';

let db: Db;

const [captain, asker, other, rival] = members.map((member) => member.id) as [
  string,
  string,
  string,
  string,
];

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

const teamOf = async (eventId: string, userId: string, name: string) => {
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

const ask = async (eventId: string, teamId: string, userId: string) => {
  const asked = await requestToJoinTeamResolver(db, {
    eventId,
    teamId,
    userId,
  });
  if (!asked.ok) throw asked.error;
  return asked.data.requestId;
};

const answer = (
  eventId: string,
  requestId: string,
  decision: 'accept' | 'decline',
  userId = captain,
) => answerTeamRequestResolver(db, { eventId, requestId, decision, userId });

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const statusOf = async (requestId: string) =>
  (
    await db
      .select({ status: hackathonTeamRequests.status })
      .from(hackathonTeamRequests)
      .where(eq(hackathonTeamRequests.id, requestId))
  )[0]?.status;

const sizeOf = async (teamId: string) =>
  (
    await db
      .select()
      .from(hackathonTeamMembers)
      .where(eq(hackathonTeamMembers.teamId, teamId))
  ).length;

const withTeam = async (teamMax = 4) => {
  const eventId = await openHackathon(db, { teamMax });
  for (const userId of [captain, asker, other, rival])
    await register(eventId, userId);
  const teamId = await teamOf(eventId, captain, 'Byte Club');
  return { eventId, teamId };
};

describe('asking to join a team (B-TEAM-05, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('accepts a request into the team and cancels the member’s other requests', async () => {
    const { eventId, teamId } = await withTeam();
    const otherTeam = await teamOf(eventId, other, 'Night Owls');
    const requestId = await ask(eventId, teamId, asker);
    const elsewhere = await ask(eventId, otherTeam, asker);

    expect(
      codeOf(
        await requestToJoinTeamResolver(db, { eventId, teamId, userId: asker }),
      ),
    ).toBe('team_request_exists');

    expect(await answer(eventId, requestId, 'accept')).toEqual({
      ok: true,
      data: { teamId },
    });
    expect(await statusOf(requestId)).toBe('accepted');
    expect(await statusOf(elsewhere)).toBe('cancelled');
    expect(await sizeOf(teamId)).toBe(2);
    expect(codeOf(await answer(eventId, requestId, 'accept'))).toBe(
      'team_request_not_found',
    );
  });

  it('declines and cancels pending requests, each by the right member only', async () => {
    const { eventId, teamId } = await withTeam();
    const declined = await ask(eventId, teamId, asker);
    const cancelled = await ask(eventId, teamId, rival);

    expect(codeOf(await answer(eventId, declined, 'decline', asker))).toBe(
      'not_team_captain',
    );
    expect(await answer(eventId, declined, 'decline')).toEqual({
      ok: true,
      data: { teamId },
    });
    expect(await statusOf(declined)).toBe('declined');

    expect(
      codeOf(
        await cancelTeamRequestResolver(db, {
          eventId,
          requestId: cancelled,
          userId: asker,
        }),
      ),
    ).toBe('team_request_not_found');
    expect(
      await cancelTeamRequestResolver(db, {
        eventId,
        requestId: cancelled,
        userId: rival,
      }),
    ).toEqual({ ok: true, data: true });
    expect(await statusOf(cancelled)).toBe('cancelled');
    expect(await sizeOf(teamId)).toBe(1);
  });

  it('refuses a request to a full team, and accepts no one past its size', async () => {
    const { eventId, teamId } = await withTeam(2);
    const first = await ask(eventId, teamId, asker);
    const second = await ask(eventId, teamId, rival);

    const both = await Promise.all([
      answer(eventId, first, 'accept'),
      answer(eventId, second, 'accept'),
    ]);

    expect(both.filter((result) => result.ok)).toHaveLength(1);
    expect(both.map(codeOf)).toContain('team_full');
    expect(await sizeOf(teamId)).toBe(2);
    expect(
      codeOf(
        await requestToJoinTeamResolver(db, { eventId, teamId, userId: other }),
      ),
    ).toBe('team_full');
  });

  it('refuses a team of another hackathon, and a member already in a team', async () => {
    const { eventId, teamId } = await withTeam();
    const elsewhere = await openHackathon(db);
    await register(elsewhere, other);
    const otherTeam = await teamOf(elsewhere, other, 'Night Owls');

    expect(
      codeOf(
        await requestToJoinTeamResolver(db, {
          eventId,
          teamId: otherTeam,
          userId: asker,
        }),
      ),
    ).toBe('team_not_found');
    expect(
      codeOf(
        await requestToJoinTeamResolver(db, {
          eventId,
          teamId,
          userId: captain,
        }),
      ),
    ).toBe('already_in_team');
  });

  it('answers nothing once the submission deadline has passed', async () => {
    const { eventId, teamId } = await withTeam();
    const requestId = await ask(eventId, teamId, asker);

    expect(
      codeOf(
        await answerTeamRequestResolver(
          db,
          { eventId, requestId, decision: 'accept', userId: captain },
          Date.parse('2099-01-17T00:00:00Z'),
        ),
      ),
    ).toBe('teams_locked');
    expect(await statusOf(requestId)).toBe('pending');
  });
});
