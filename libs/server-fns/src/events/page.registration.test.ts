import { beforeEach, describe, expect, it } from 'vitest';

import { eq, events, organization, type Db } from '@founders-coffee/db';

import { judgeOf } from '../hackathons/judging.fixtures.js';
import { registerForHackathonResolver } from '../hackathons/registration.js';
import {
  openHackathon,
  setHackathons,
} from '../hackathons/registration.fixtures.js';
import { members, seedEvent, setupDb } from '../rsvps/resolver.fixtures.js';
import { coOrganise, organisation, signUp } from './organisers.fixtures.js';
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
      isJudge: false,
      isOrganiser: false,
    });
    expect(await registrationOn(eventId, other.id)).toEqual({
      isFull: false,
      viewer: null,
      isJudge: false,
      isOrganiser: false,
    });
    expect(await registrationOn(eventId)).toEqual({
      isFull: false,
      viewer: null,
      isJudge: false,
      isOrganiser: false,
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
      isJudge: false,
      isOrganiser: false,
    });
  });

  it('says who judges the hackathon and who belongs to the organisation leading it', async () => {
    const eventId = await openHackathon(db);
    const judge = await judgeOf(db, eventId);
    const invited = await judgeOf(db, eventId, 'invited');
    await signUp(db, 'usr_lead');
    await signUp(db, 'usr_cohost');
    await organisation(db, 'org_lead', 'usr_lead');
    await organisation(db, 'org_cohost', 'usr_cohost');
    await coOrganise(db, eventId, 'org_lead', 'lead');
    await coOrganise(db, eventId, 'org_cohost');

    expect(await registrationOn(eventId, judge.userId)).toMatchObject({
      isJudge: true,
      isOrganiser: false,
    });
    expect(await registrationOn(eventId, invited.userId)).toMatchObject({
      isJudge: false,
    });
    expect(await registrationOn(eventId, 'usr_lead')).toMatchObject({
      isJudge: false,
      isOrganiser: true,
    });
    expect(await registrationOn(eventId, 'usr_cohost')).toMatchObject({
      isOrganiser: false,
    });
  });

  it('does not offer hackathon management after the lead organisation is suspended (B-OPS-01)', async () => {
    const eventId = await openHackathon(db);
    await signUp(db, 'usr_lead');
    await organisation(db, 'org_lead', 'usr_lead');
    await coOrganise(db, eventId, 'org_lead', 'lead');

    await db
      .update(organization)
      .set({ status: 'suspended' })
      .where(eq(organization.id, 'org_lead'));

    expect(await registrationOn(eventId, 'usr_lead')).toMatchObject({
      isOrganiser: false,
    });
  });

  it('carries no registration for a meetup', async () => {
    const eventId = await seedEvent(db);

    expect(await registrationOn(eventId)).toBeNull();
  });
});
