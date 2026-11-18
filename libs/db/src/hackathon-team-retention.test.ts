import { beforeAll, describe, expect, it } from 'vitest';
import { eq, sql, type SQL } from 'drizzle-orm';

import { id } from '@founders-coffee/core';

import { person } from './account-closure.fixtures.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import {
  clearExpiredHackathonSkills,
  deleteExpiredHackathonTeamInvites,
  deleteExpiredHackathonTeamRequests,
} from './hackathon-team-retention.js';
import { newTeam, register } from './hackathon-teams.fixtures.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import {
  hackathonRegistrations,
  hackathonTeamInvites,
  hackathonTeamRequests,
} from './schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2099-06-01T00:00:00Z');

let db: Db;

const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

/** A hackathon that ended `endedDaysAgo` days before `NOW`, with one of everything the sweep reads. */
const ended = async (endedDaysAgo: number) => {
  const row = {
    ...hackathonEventRow(),
    startsAt: daysAgo(endedDaysAgo + 2),
    endsAt: daysAgo(endedDaysAgo),
  };
  await createHackathon(db, row);
  const member = await person(db, 'Rania');
  await register(db, row.id, member.id);
  const teamId = await newTeam(db, row.id, `Team ${row.id}`);
  const inviteId = id('inv');
  await db.insert(hackathonTeamInvites).values({
    id: inviteId,
    teamId,
    tokenHash: id('hash'),
    createdBy: member.id,
    expiresAt: daysAgo(endedDaysAgo),
  });
  const requestId = id('req');
  await db.insert(hackathonTeamRequests).values({
    id: requestId,
    teamId,
    eventId: row.id,
    userId: member.id,
  });
  return { eventId: row.id, inviteId, requestId };
};

const inviteExists = async (inviteId: string) =>
  (
    await db
      .select({ id: hackathonTeamInvites.id })
      .from(hackathonTeamInvites)
      .where(eq(hackathonTeamInvites.id, inviteId))
  ).length === 1;

const requestExists = async (requestId: string) =>
  (
    await db
      .select({ id: hackathonTeamRequests.id })
      .from(hackathonTeamRequests)
      .where(eq(hackathonTeamRequests.id, requestId))
  ).length === 1;

const skillsOf = async (eventId: string) =>
  db
    .select({ skills: hackathonRegistrations.skills })
    .from(hackathonRegistrations)
    .where(eq(hackathonRegistrations.eventId, eventId));

const drain = async (sweep: (limit: number) => Promise<number>) => {
  let total = 0;
  for (let batch = await sweep(100); batch > 0; batch = await sweep(100))
    total += batch;
  return total;
};

describe('retention for hackathon teams (B-SAFE-05, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('deletes invite links and join requests thirty days after the hackathon, and no sooner', async () => {
    const old = await ended(31);
    const recent = await ended(29);

    await drain((limit) =>
      deleteExpiredHackathonTeamInvites(db, { now: NOW, limit }),
    );
    await drain((limit) =>
      deleteExpiredHackathonTeamRequests(db, { now: NOW, limit }),
    );

    expect(await inviteExists(old.inviteId)).toBe(false);
    expect(await requestExists(old.requestId)).toBe(false);
    expect(await inviteExists(recent.inviteId)).toBe(true);
    expect(await requestExists(recent.requestId)).toBe(true);
  });

  it('clears the skills line twelve months after the hackathon, and keeps the registration', async () => {
    const old = await ended(366);
    const recent = await ended(300);

    await drain((limit) =>
      clearExpiredHackathonSkills(db, { now: NOW, limit }),
    );

    expect(await skillsOf(old.eventId)).toEqual([{ skills: null }]);
    expect(await skillsOf(recent.eventId)).toEqual([
      { skills: 'TypeScript, product design' },
    ]);
  });

  it('touches no more than its limit in one call', async () => {
    await ended(400);
    await ended(401);

    expect(
      await deleteExpiredHackathonTeamInvites(db, { now: NOW, limit: 1 }),
    ).toBe(1);
    expect(
      await deleteExpiredHackathonTeamRequests(db, { now: NOW, limit: 1 }),
    ).toBe(1);
    expect(await clearExpiredHackathonSkills(db, { now: NOW, limit: 1 })).toBe(
      1,
    );
  });

  it('reads through its indexes', async () => {
    const plan = async (query: SQL) =>
      JSON.stringify(await db.all(sql`EXPLAIN QUERY PLAN ${query}`));
    const hackathons = sql`SELECT id FROM events WHERE kind = 'hackathon' AND ends_at < 1`;

    expect(await plan(hackathons)).toContain('events_hackathon_ends_index');
    expect(
      await plan(
        sql`SELECT id FROM hackathon_registrations WHERE skills IS NOT NULL AND event_id IN (${hackathons}) LIMIT 1`,
      ),
    ).toContain('hackathon_registrations_skills_index');
  });
});
