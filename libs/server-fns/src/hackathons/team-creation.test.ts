import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  and,
  eq,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
  type Db,
} from '@founders-coffee/db';
import type { Metrics } from '@founders-coffee/observability';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import {
  createHackathonTeamResolver,
  type TeamCreateInput,
} from './team-creation.js';

let db: Db;

const register = (eventId: string, userId: string) =>
  registerForHackathonResolver(db, null, {
    eventId,
    userId,
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam: true,
    skills: null,
  });

const create = (
  eventId: string,
  userId: string,
  changes: Partial<TeamCreateInput> = {},
  metrics: Metrics | null = null,
  now?: number,
) =>
  createHackathonTeamResolver(
    db,
    metrics,
    {
      eventId,
      userId,
      name: 'Byte Club',
      description: null,
      isLookingForMembers: true,
      ...changes,
    },
    now,
  );

const codeOf = async (result: ReturnType<typeof create>) => {
  const settled = await result;
  return settled.ok ? null : settled.error.code;
};

const teamsOf = (eventId: string) =>
  db.select().from(hackathonTeams).where(eq(hackathonTeams.eventId, eventId));

const [first, second, third] = members.map((member) => member.id) as [
  string,
  string,
  string,
];

describe('starting a team (B-TEAM-03, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('starts the team with its creator as captain, and counts it', async () => {
    const trackEvent = vi.fn();
    const eventId = await openHackathon(db);
    await register(eventId, first);

    const result = await create(
      eventId,
      first,
      { description: 'We build tools for cafés' },
      { trackEvent } as unknown as Metrics,
    );

    expect(result).toEqual({ ok: true, data: { teamId: expect.any(String) } });
    const teamId = result.ok ? result.data.teamId : '';
    expect(await teamsOf(eventId)).toEqual([
      expect.objectContaining({
        id: teamId,
        name: 'Byte Club',
        description: 'We build tools for cafés',
        isLookingForMembers: true,
      }),
    ]);
    expect(
      await db
        .select()
        .from(hackathonTeamMembers)
        .where(eq(hackathonTeamMembers.teamId, teamId)),
    ).toEqual([
      expect.objectContaining({ userId: first, isCaptain: true, eventId }),
    ]);
    expect(trackEvent).toHaveBeenCalledWith('team_created', {
      market: 'DZ',
      hackathon: eventId,
    });
  });

  it('refuses a name another team has, whatever its case', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await register(eventId, second);
    await create(eventId, first);

    expect(await codeOf(create(eventId, second, { name: 'byte CLUB' }))).toBe(
      'team_name_taken',
    );
    expect(await teamsOf(eventId)).toHaveLength(1);
  });

  it('gives a name asked for twice at once to one team', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await register(eventId, second);

    const codes = await Promise.all([
      codeOf(create(eventId, first)),
      codeOf(create(eventId, second)),
    ]);

    expect(codes.sort()).toEqual([null, 'team_name_taken'].sort());
    expect(await teamsOf(eventId)).toHaveLength(1);
  });

  it('refuses a member already in a team, or starting two at once', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);

    const codes = await Promise.all([
      codeOf(create(eventId, first, { name: 'One' })),
      codeOf(create(eventId, first, { name: 'Two' })),
    ]);

    expect(codes.sort()).toEqual([null, 'already_in_team'].sort());
    expect(await teamsOf(eventId)).toHaveLength(1);
    expect(await codeOf(create(eventId, first, { name: 'Three' }))).toBe(
      'already_in_team',
    );
  });

  it('cancels the creator’s pending requests to join other teams', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await register(eventId, second);
    const other = await create(eventId, second, { name: 'Other' });
    const otherId = other.ok ? other.data.teamId : '';
    await db
      .insert(hackathonTeamRequests)
      .values({ id: 'rq_create', teamId: otherId, eventId, userId: first });

    await create(eventId, first);

    const [request] = await db
      .select()
      .from(hackathonTeamRequests)
      .where(
        and(
          eq(hackathonTeamRequests.id, 'rq_create'),
          eq(hackathonTeamRequests.status, 'cancelled'),
        ),
      );
    expect(request?.decidedAt).toEqual(expect.any(Date));
  });

  it('refuses someone on the waitlist or not registered', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });
    await register(eventId, first);
    await register(eventId, second);

    expect(await codeOf(create(eventId, second))).toBe('not_registered');
    expect(await codeOf(create(eventId, third))).toBe('not_registered');
    expect(await teamsOf(eventId)).toEqual([]);
  });

  it('refuses from the submission deadline on', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);

    expect(
      await codeOf(
        create(eventId, first, {}, null, Date.parse('2099-01-16T12:00:00Z')),
      ),
    ).toBe('teams_locked');
  });

  it('refuses while hackathons are switched off in the market', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await setHackathons(db, false);

    expect(await codeOf(create(eventId, first))).toBe('hackathons_disabled');
    expect(await teamsOf(eventId)).toEqual([]);
  });
});
