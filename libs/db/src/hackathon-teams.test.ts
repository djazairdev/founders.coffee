import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { id } from '@founders-coffee/core';

import { person } from './account-closure.fixtures.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import { join, newTeam, register } from './hackathon-teams.fixtures.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import {
  events,
  hackathonTeamInvites,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
} from './schema.js';

let db: Db;

const newHackathon = async () => {
  const row = hackathonEventRow();
  await createHackathon(db, row);
  return row.id;
};

const registered = async (eventId: string, name: string) => {
  const someone = await person(db, name);
  await register(db, eventId, someone.id);
  return someone.id;
};

const request = (
  team: { teamId: string; eventId: string },
  userId: string,
  status: 'pending' | 'declined' = 'pending',
) =>
  db.insert(hackathonTeamRequests).values({
    id: id('treq'),
    ...team,
    userId,
    status,
    decidedAt: status === 'pending' ? null : new Date(),
  });

describe('hackathon teams (B-TEAM-01, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('keeps a participant in one team per hackathon, and only a registered one', async () => {
    const eventId = await newHackathon();
    const first = { eventId, teamId: await newTeam(db, eventId, 'Byte Club') };
    const second = {
      eventId,
      teamId: await newTeam(db, eventId, 'Night Owls'),
    };
    const participant = await registered(eventId, 'Lina');
    const outsider = await person(db, 'Karim');

    await join(db, first, participant, { isCaptain: true });

    await expect(join(db, second, participant)).rejects.toThrow();
    await expect(join(db, second, outsider.id)).rejects.toThrow();
    expect(
      await db
        .select()
        .from(hackathonTeamMembers)
        .where(eq(hackathonTeamMembers.eventId, eventId)),
    ).toHaveLength(1);
  });

  it('lets a participant be in a team of each hackathon they are registered for', async () => {
    const firstEvent = await newHackathon();
    const secondEvent = await newHackathon();
    const participant = await registered(firstEvent, 'Sami');
    await register(db, secondEvent, participant);

    await join(
      db,
      { eventId: firstEvent, teamId: await newTeam(db, firstEvent, 'Crew') },
      participant,
    );
    await join(
      db,
      { eventId: secondEvent, teamId: await newTeam(db, secondEvent, 'Crew') },
      participant,
    );
  });

  it('refuses a second captain, and a team of another hackathon', async () => {
    const eventId = await newHackathon();
    const otherEvent = await newHackathon();
    const team = { eventId, teamId: await newTeam(db, eventId, 'Captains') };
    const otherTeam = await newTeam(db, otherEvent, 'Elsewhere');
    const captain = await registered(eventId, 'Yasmine');
    const second = await registered(eventId, 'Walid');

    await join(db, team, captain, { isCaptain: true });

    await expect(join(db, team, second, { isCaptain: true })).rejects.toThrow();
    await expect(
      join(db, { eventId, teamId: otherTeam }, second),
    ).rejects.toThrow();
    await join(db, team, second);
  });

  it('holds a name unique within its hackathon, whatever its case, and within its limits', async () => {
    const eventId = await newHackathon();
    await newTeam(db, eventId, 'Byte Club');

    await expect(newTeam(db, eventId, 'byte club')).rejects.toThrow();
    await expect(newTeam(db, eventId, '   ')).rejects.toThrow();
    await expect(newTeam(db, eventId, 'x'.repeat(61))).rejects.toThrow();
    await expect(
      db.insert(hackathonTeams).values({
        id: id('team'),
        eventId,
        name: 'Long story',
        description: 'x'.repeat(501),
      }),
    ).rejects.toThrow();
    await newTeam(db, await newHackathon(), 'Byte Club');
  });

  it('keeps one pending request per person and team, and dates every answer', async () => {
    const eventId = await newHackathon();
    const team = { eventId, teamId: await newTeam(db, eventId, 'Requests') };
    const asking = await registered(eventId, 'Nour');

    await request(team, asking);
    await expect(request(team, asking)).rejects.toThrow();
    await request(team, asking, 'declined');
    await expect(
      db.insert(hackathonTeamRequests).values({
        id: id('treq'),
        ...team,
        userId: asking,
        status: 'accepted',
      }),
    ).rejects.toThrow();
    await expect(
      request({ eventId, teamId: team.teamId }, (await person(db, 'Rami')).id),
    ).rejects.toThrow();
  });

  it('keeps each invite token once, and deletes everything with the hackathon', async () => {
    const eventId = await newHackathon();
    const team = { eventId, teamId: await newTeam(db, eventId, 'Invites') };
    const captain = await registered(eventId, 'Adel');
    const asking = await registered(eventId, 'Imane');
    await join(db, team, captain, { isCaptain: true });
    await request(team, asking);
    const invite = {
      teamId: team.teamId,
      tokenHash: `hash-${eventId}`,
      createdBy: captain,
      expiresAt: new Date('2099-01-12T09:00:00Z'),
    };
    await db.insert(hackathonTeamInvites).values({ id: id('tinv'), ...invite });
    await expect(
      db.insert(hackathonTeamInvites).values({ id: id('tinv'), ...invite }),
    ).rejects.toThrow();

    await db.delete(events).where(eq(events.id, eventId));

    for (const rows of [
      await db
        .select()
        .from(hackathonTeams)
        .where(eq(hackathonTeams.eventId, eventId)),
      await db
        .select()
        .from(hackathonTeamMembers)
        .where(eq(hackathonTeamMembers.eventId, eventId)),
      await db
        .select()
        .from(hackathonTeamRequests)
        .where(eq(hackathonTeamRequests.eventId, eventId)),
      await db
        .select()
        .from(hackathonTeamInvites)
        .where(eq(hackathonTeamInvites.teamId, team.teamId)),
    ])
      expect(rows).toEqual([]);
  });
});
