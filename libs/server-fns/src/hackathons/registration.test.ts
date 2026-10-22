import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  and,
  eq,
  getEvent,
  hackathonRegistrations,
  hackathons,
  type Db,
} from '@founders-coffee/db';
import type { Metrics } from '@founders-coffee/observability';

import { meetingLinkFor } from '../events/meeting-link.js';
import { members, seedEvent, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import {
  registerForHackathonResolver,
  type RegistrationInput,
} from './registration.js';

let db: Db;

const DAY_MS = 86_400_000;

const register = (
  eventId: string,
  userId: string,
  changes: Partial<RegistrationInput> = {},
  metrics: Metrics | null = null,
) =>
  registerForHackathonResolver(db, metrics, {
    eventId,
    userId,
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam: false,
    skills: null,
    ...changes,
  });

const codeOf = async (result: ReturnType<typeof register>) => {
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

const rowOf = async (eventId: string, userId: string) =>
  (
    await db
      .select()
      .from(hackathonRegistrations)
      .where(
        and(
          eq(hackathonRegistrations.eventId, eventId),
          eq(hackathonRegistrations.userId, userId),
        ),
      )
  )[0];

describe('registering for a hackathon (B-REG-03, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('gives a place, counts it, and keeps what the member said', async () => {
    const trackEvent = vi.fn();
    const eventId = await openHackathon(db, { minimumAge: 16, capacity: 50 });

    const result = await register(
      eventId,
      members[0].id,
      { isAgeAttested: true, isLookingForTeam: true, skills: 'Go, Postgres' },
      { trackEvent } as unknown as Metrics,
    );

    expect(result).toEqual({
      ok: true,
      data: { registrationId: expect.any(String), status: 'registered' },
    });
    expect(await countOf(eventId)).toBe(1);
    expect(await rowOf(eventId, members[0].id)).toMatchObject({
      status: 'registered',
      attendanceMode: 'in_person',
      codeOfConductAcceptedAt: expect.any(Date),
      ageAttestedAt: expect.any(Date),
      isLookingForTeam: true,
      skills: 'Go, Postgres',
    });
    expect(trackEvent).toHaveBeenCalledWith('registration_created', {
      market: 'DZ',
      hackathon: eventId,
    });
  });

  it('puts the member on the waitlist once every place is taken, without counting them', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });

    await register(eventId, members[0].id);
    const second = await register(eventId, members[1].id);

    expect(second.ok && second.data.status).toBe('waitlisted');
    expect(await countOf(eventId)).toBe(1);
    expect((await rowOf(eventId, members[1].id))?.status).toBe('waitlisted');
  });

  it('gives the last place to one of two members asking at once', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });

    const results = await Promise.all([
      register(eventId, members[0].id),
      register(eventId, members[1].id),
    ]);

    expect(
      results.map((result) => (result.ok ? result.data.status : null)).sort(),
    ).toEqual(['registered', 'waitlisted']);
    expect(await countOf(eventId)).toBe(1);
  });

  it('records no age where the hackathon has no minimum', async () => {
    const eventId = await openHackathon(db);

    await register(eventId, members[0].id, { isAgeAttested: true });

    expect((await rowOf(eventId, members[0].id))?.ageAttestedAt).toBeNull();
  });

  it('refuses a second registration, and counts the place once', async () => {
    const eventId = await openHackathon(db);

    await register(eventId, members[0].id);

    expect(await codeOf(register(eventId, members[0].id))).toBe(
      'already_registered',
    );
    expect(await countOf(eventId)).toBe(1);
  });

  it('refuses outside the registration window, writing nothing', async () => {
    const early = await openHackathon(db, {
      registrationOpensAt: new Date(Date.now() + DAY_MS),
    });
    const late = await openHackathon(db, {
      registrationOpensAt: new Date(Date.now() - 3 * DAY_MS),
      registrationClosesAt: new Date(Date.now() - DAY_MS),
    });

    for (const eventId of [early, late]) {
      expect(await codeOf(register(eventId, members[0].id))).toBe(
        'registration_closed',
      );
      expect(await rowOf(eventId, members[0].id)).toBeUndefined();
    }
  });

  it('refuses a way of attending the format does not offer, and an unattested minimum age', async () => {
    const eventId = await openHackathon(db, { minimumAge: 18 });

    expect(
      await codeOf(
        register(eventId, members[0].id, { attendanceMode: 'online' }),
      ),
    ).toBe('attendance_mode_unavailable');
    expect(await codeOf(register(eventId, members[0].id))).toBe('not_eligible');
    expect(await countOf(eventId)).toBe(0);
  });

  it('answers as not found for a draft, a meetup or no event, and refuses where hackathons are off', async () => {
    const draft = await openHackathon(db, {}, { status: 'draft' });
    const meetup = await seedEvent(db);
    const open = await openHackathon(db);

    for (const eventId of [draft, meetup, 'evt_missing'])
      expect(await codeOf(register(eventId, members[0].id))).toBe(
        'event_not_found',
      );

    await setHackathons(db, false);
    expect(await codeOf(register(open, members[0].id))).toBe(
      'hackathons_disabled',
    );
  });

  it('gives the meeting link to registered participants, not to those waiting', async () => {
    const eventId = await openHackathon(
      db,
      { capacity: 1, attendanceModes: ['online'] },
      {
        format: 'online',
        venue: null,
        meetingUrl: 'https://meet.example.org/hack',
      },
    );
    await register(eventId, members[0].id, { attendanceMode: 'online' });
    await register(eventId, members[1].id, { attendanceMode: 'online' });
    const event = await getEvent(db, eventId);
    if (!event) throw new Error('no event');

    const linkFor = (userId: string) =>
      meetingLinkFor(db, event, { id: userId, isGoing: false });

    expect(await linkFor(members[0].id)).toBe('https://meet.example.org/hack');
    expect(await linkFor(members[1].id)).toBeNull();
    expect(await linkFor(members[2].id)).toBeNull();
  });
});
