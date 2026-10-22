import { beforeEach, describe, expect, it } from 'vitest';

import { eq, events, type Db } from '@founders-coffee/db';

import { registerForHackathonResolver } from '../hackathons/registration.js';
import {
  openHackathon,
  setHackathons,
} from '../hackathons/registration.fixtures.js';
import { members, seedEvent, setupDb } from '../rsvps/resolver.fixtures.js';
import { readEventPage } from './page.js';

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

const registrationOn = async (eventId: string, viewerId?: string) => {
  const [row] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, eventId));
  const page = await readEventPage(
    db,
    { marketCode: 'DZ', slug: row?.slug ?? '' },
    Promise.resolve(viewerId),
  );
  if (!page.ok) throw page.error;
  return page.data.registration;
};

describe('the registration card’s data on a hackathon page (B-REG-06, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('gives the reader their own registration, and nobody else’s', async () => {
    const eventId = await openHackathon(db);
    const [member, other] = members;
    if (!member || !other) throw new Error('members are seeded');
    const registered = await register(eventId, member.id);
    if (!registered.ok) throw registered.error;

    expect(await registrationOn(eventId, member.id)).toEqual({
      isFull: false,
      viewer: { status: 'registered', attendanceMode: 'in_person' },
    });
    expect(await registrationOn(eventId, other.id)).toEqual({
      isFull: false,
      viewer: null,
    });
    expect(await registrationOn(eventId)).toEqual({
      isFull: false,
      viewer: null,
    });
  });

  it('says the hackathon is full once every place is taken', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });
    const [first, second] = members;
    if (!first || !second) throw new Error('members are seeded');
    await register(eventId, first.id);
    await register(eventId, second.id);

    expect(await registrationOn(eventId, second.id)).toEqual({
      isFull: true,
      viewer: { status: 'waitlisted', attendanceMode: 'in_person' },
    });
  });

  it('carries no registration for a meetup', async () => {
    const eventId = await seedEvent(db);

    expect(await registrationOn(eventId)).toBeNull();
  });
});
