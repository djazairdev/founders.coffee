import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  and,
  eq,
  events,
  hackathonRegistrations,
  hackathons,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
  withdrawHackathonRegistration,
  type Db,
} from '@founders-coffee/db';
import type { Metrics } from '@founders-coffee/observability';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { withdrawFromHackathonResolver } from './withdrawal.js';

let db: Db;

const register = (eventId: string, userId: string) =>
  registerForHackathonResolver(db, null, {
    eventId,
    userId,
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam: false,
    skills: null,
  });

const withdraw = (
  eventId: string,
  userId: string,
  metrics: Metrics | null = null,
  now?: number,
) => withdrawFromHackathonResolver(db, metrics, { eventId, userId }, now);

const codeOf = async (result: ReturnType<typeof withdraw>) => {
  const settled = await result;
  return settled.ok ? null : settled.error.code;
};

const countOf = async (eventId: string) =>
  (
    await db
      .select({ count: hackathons.registeredCount })
      .from(hackathons)
      .where(eq(hackathons.eventId, eventId))
  )[0]?.count;

const statusOf = async (eventId: string, userId: string) =>
  (
    await db
      .select({ status: hackathonRegistrations.status })
      .from(hackathonRegistrations)
      .where(
        and(
          eq(hackathonRegistrations.eventId, eventId),
          eq(hackathonRegistrations.userId, userId),
        ),
      )
  )[0]?.status;

const formTeam = async (
  eventId: string,
  teamId: string,
  captainId: string,
  others: readonly string[] = [],
) => {
  await db.insert(hackathonTeams).values({ id: teamId, eventId, name: teamId });
  await db
    .insert(hackathonTeamMembers)
    .values([
      { teamId, eventId, userId: captainId, isCaptain: true },
      ...others.map((userId) => ({ teamId, eventId, userId })),
    ]);
};

const teamsOf = async (eventId: string) =>
  (
    await db
      .select({ id: hackathonTeams.id })
      .from(hackathonTeams)
      .where(eq(hackathonTeams.eventId, eventId))
  ).map((team) => team.id);

const membersOf = async (teamId: string) =>
  (
    await db
      .select({ userId: hackathonTeamMembers.userId })
      .from(hackathonTeamMembers)
      .where(eq(hackathonTeamMembers.teamId, teamId))
  ).map((member) => member.userId);

const [first, second, third, fourth] = members.map((member) => member.id) as [
  string,
  string,
  string,
  string,
];

describe('withdrawing from a hackathon (B-REG-04, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('gives the place back when nobody waits, and counts it', async () => {
    const trackEvent = vi.fn();
    const eventId = await openHackathon(db, { capacity: 2 });
    await register(eventId, first);

    const result = await withdraw(eventId, first, {
      trackEvent,
    } as unknown as Metrics);

    expect(result).toEqual({ ok: true, data: { isWithdrawn: true } });
    expect(await statusOf(eventId, first)).toBe('withdrawn');
    expect(await countOf(eventId)).toBe(0);
    expect(trackEvent).toHaveBeenCalledWith('registration_withdrawn', {
      market: 'DZ',
      hackathon: eventId,
    });
  });

  it('gives the place to the earliest member on the waitlist, keeping the count', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });
    await register(eventId, first);
    await register(eventId, second);
    await register(eventId, third);

    expect(await withdraw(eventId, first)).toMatchObject({ ok: true });

    expect(await statusOf(eventId, second)).toBe('registered');
    expect(await statusOf(eventId, third)).toBe('waitlisted');
    expect(await countOf(eventId)).toBe(1);
  });

  it('takes a waitlisted member off the list without promoting anyone', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });
    await register(eventId, first);
    await register(eventId, second);
    await register(eventId, third);

    expect(await withdraw(eventId, second)).toMatchObject({ ok: true });

    expect(await statusOf(eventId, first)).toBe('registered');
    expect(await statusOf(eventId, third)).toBe('waitlisted');
    expect(await countOf(eventId)).toBe(1);
  });

  it('takes a team its captain was alone in, and cancels their pending requests', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await register(eventId, second);
    await formTeam(eventId, 'tm_solo', first);
    await formTeam(eventId, 'tm_other', second);
    await db
      .insert(hackathonTeamRequests)
      .values({ id: 'rq_1', teamId: 'tm_other', eventId, userId: first });

    expect(await withdraw(eventId, first)).toMatchObject({ ok: true });

    expect(await teamsOf(eventId)).toEqual(['tm_other']);
    const [request] = await db
      .select()
      .from(hackathonTeamRequests)
      .where(eq(hackathonTeamRequests.id, 'rq_1'));
    expect(request).toMatchObject({
      status: 'cancelled',
      decidedAt: expect.any(Date),
    });
  });

  it('takes a member out of their team and leaves the team to the others', async () => {
    const eventId = await openHackathon(db);
    for (const userId of [first, second, third])
      await register(eventId, userId);
    await formTeam(eventId, 'tm_three', first, [second, third]);

    expect(await withdraw(eventId, second)).toMatchObject({ ok: true });

    expect((await membersOf('tm_three')).sort()).toEqual([first, third].sort());
  });

  it('asks a captain with teammates to hand the team on first, and changes nothing', async () => {
    const eventId = await openHackathon(db, { capacity: 2 });
    for (const userId of [first, second, third])
      await register(eventId, userId);
    await formTeam(eventId, 'tm_pair', first, [second]);

    expect(await codeOf(withdraw(eventId, first))).toBe(
      'captain_must_transfer',
    );
    expect(
      await withdrawHackathonRegistration(db, { eventId, userId: first }),
    ).toEqual({ outcome: 'not_withdrawn' });

    expect(await statusOf(eventId, first)).toBe('registered');
    expect(await statusOf(eventId, third)).toBe('waitlisted');
    expect((await membersOf('tm_pair')).sort()).toEqual([first, second].sort());
    expect(await countOf(eventId)).toBe(2);
  });

  it('refuses from the submission deadline on', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);

    expect(
      await codeOf(
        withdraw(eventId, first, null, Date.parse('2099-01-16T12:00:00Z')),
      ),
    ).toBe('withdrawal_closed');
    expect(await statusOf(eventId, first)).toBe('registered');
  });

  it('refuses someone who is not registered, or has already withdrawn', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);

    expect(await codeOf(withdraw(eventId, fourth))).toBe('not_registered');
    await withdraw(eventId, first);
    expect(await codeOf(withdraw(eventId, first))).toBe('not_registered');
    expect(await countOf(eventId)).toBe(0);
  });

  it('writes nothing once the hackathon is no longer published', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await db
      .update(events)
      .set({ status: 'cancelled' })
      .where(eq(events.id, eventId));

    expect(
      await withdrawHackathonRegistration(db, { eventId, userId: first }),
    ).toEqual({ outcome: 'not_withdrawn' });
    expect(await codeOf(withdraw(eventId, first))).toBe('event_not_found');
    expect(await statusOf(eventId, first)).toBe('registered');
  });

  it('refuses while hackathons are switched off in the market', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await setHackathons(db, false);

    expect(await codeOf(withdraw(eventId, first))).not.toBeNull();
    expect(await statusOf(eventId, first)).toBe('registered');
  });
});
