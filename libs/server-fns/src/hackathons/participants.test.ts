import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  hackathonRegistrations,
  listHackathonParticipants,
  user,
  type Db,
} from '@founders-coffee/db';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { hackathonParticipantsResolver } from './participants.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { createHackathonTeamResolver } from './team-creation.js';

let db: Db;

beforeEach(async () => {
  db = await setupDb();
  await setHackathons(db, true);
});

const register = async (eventId: string, userId: string | undefined) => {
  const registered = await registerForHackathonResolver(db, null, {
    eventId,
    userId: userId ?? '',
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam: false,
    skills: null,
  });
  if (!registered.ok) throw registered.error;
};

const [first, second, third] = members.map((member) => member.id);

describe('hackathonParticipantsResolver (B-REG-08, real D1)', () => {
  it('lists each participant with their mode, standing and team', async () => {
    const eventId = await openHackathon(db, { capacity: 2 });
    await register(eventId, first);
    await register(eventId, second);
    await db
      .update(hackathonRegistrations)
      .set({ attendanceMode: 'online' })
      .where(eq(hackathonRegistrations.userId, second ?? ''))
      .run();
    await register(eventId, third);
    const team = await createHackathonTeamResolver(db, null, {
      eventId,
      userId: first ?? '',
      name: 'Byte Club',
      description: null,
      isLookingForMembers: false,
    });
    expect(team.ok).toBe(true);

    const result = await hackathonParticipantsResolver(db, eventId);

    expect(result.ok && result.data.isTruncated).toBe(false);
    const byId = new Map(
      result.ok ? result.data.participants.map((row) => [row.userId, row]) : [],
    );
    expect(byId.size).toBe(3);
    expect(byId.get(first ?? '')).toMatchObject({
      attendanceMode: 'in_person',
      status: 'registered',
      teamName: 'Byte Club',
    });
    expect(byId.get(second ?? '')).toMatchObject({
      attendanceMode: 'online',
      status: 'registered',
      teamName: null,
    });
    expect(byId.get(third ?? '')?.status).toBe('waitlisted');
  });

  it('gives no contact details', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    const [row] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, first ?? ''));

    const result = await hackathonParticipantsResolver(db, eventId);

    expect(JSON.stringify(result)).not.toContain(row?.email);
    expect(
      result.ok && Object.keys(result.data.participants[0] ?? {}).sort(),
    ).toEqual(['attendanceMode', 'name', 'status', 'teamName', 'userId']);
  });

  it('keeps someone who withdrew, shown as withdrawn', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await db
      .update(hackathonRegistrations)
      .set({ status: 'withdrawn' })
      .where(eq(hackathonRegistrations.eventId, eventId))
      .run();

    const result = await hackathonParticipantsResolver(db, eventId);

    expect(result.ok && result.data.participants[0]?.status).toBe('withdrawn');
  });

  it('says when the list stops short', async () => {
    const eventId = await openHackathon(db);
    await register(eventId, first);
    await register(eventId, second);

    const shown = await listHackathonParticipants(db, eventId, 1);

    expect(shown.participants).toHaveLength(1);
    expect(shown.isTruncated).toBe(true);
  });

  it('answers as off with hackathons off, and as not found for no hackathon', async () => {
    const eventId = await openHackathon(db);
    await setHackathons(db, false);

    const off = await hackathonParticipantsResolver(db, eventId);
    expect(off.ok).toBe(false);
    if (!off.ok) expect(off.error.code).toBe('hackathons_disabled');

    await setHackathons(db, true);
    const missing = await hackathonParticipantsResolver(db, 'evt_missing');
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('event_not_found');
  });
});
