import { describe, expect, it } from 'vitest';

import { eq, events, type Db } from '@founders-coffee/db';

import {
  DAY,
  HOUR,
  hackathonWithDetails,
  setupHackathonDb,
} from '../hackathons/edit.fixtures.js';
import { hackathonScheduleOf } from './hackathon-schedule.js';
import { readEventPage } from './page.js';
import { createTestEvent } from './resolver.fixtures.js';

const anonymous = () => Promise.resolve(undefined);

const slugOf = async (db: Db, eventId: string) => {
  const [row] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, eventId));
  if (!row) throw new Error('event missing');
  return row.slug;
};

describe('a hackathon’s schedule on its page (B-HKN-17, real D1)', () => {
  it('reads every date of the timeline and the phase it is in now', async () => {
    const db = await setupHackathonDb();
    const { eventId, kickoff } = await hackathonWithDetails(db, {}, true);

    const page = await readEventPage(
      db,
      { marketCode: 'DZ', slug: await slugOf(db, eventId) },
      anonymous(),
    );

    if (!page.ok) throw page.error;
    expect(page.data.hackathon).toEqual({
      registrationOpensAt: expect.any(Number),
      registrationClosesAt: kickoff - DAY,
      kickoffAt: kickoff,
      submissionDeadlineAt: kickoff + 2 * DAY - HOUR,
      endsAt: kickoff + 2 * DAY,
      judgingEndsAt: kickoff + 9 * DAY,
      phase: 'upcoming',
    });
    expect(page.data.hackathon?.registrationOpensAt).toBeGreaterThan(
      Date.now(),
    );
  });

  it('carries no schedule for a meetup', async () => {
    const db = await setupHackathonDb();
    const { slug } = await createTestEvent(db);

    const page = await readEventPage(
      db,
      { marketCode: 'DZ', slug },
      anonymous(),
    );

    if (!page.ok) throw page.error;
    expect(page.data.hackathon).toBeNull();
  });
});

describe('hackathonScheduleOf (B-HKN-17)', () => {
  const event = {
    kind: 'hackathon' as const,
    startsAt: new Date('2099-01-15T09:00:00Z'),
    endsAt: new Date('2099-01-16T18:00:00Z'),
  };
  const row = {
    registrationOpensAt: new Date('2099-01-01T00:00:00Z'),
    registrationClosesAt: new Date('2099-01-10T00:00:00Z'),
    submissionDeadlineAt: new Date('2099-01-16T12:00:00Z'),
    judgingEndsAt: new Date('2099-01-20T18:00:00Z'),
  };

  it('decides the phase at the moment it is read', () => {
    const at = (iso: string) =>
      hackathonScheduleOf(event, row, Date.parse(iso))?.phase;
    expect(at('2098-12-31T23:59:59Z')).toBe('upcoming');
    expect(at('2099-01-01T00:00:00Z')).toBe('registration_open');
    expect(at('2099-01-12T00:00:00Z')).toBe('registration_closed');
    expect(at('2099-01-15T09:00:00Z')).toBe('building');
    expect(at('2099-01-16T12:00:00Z')).toBe('judging');
    expect(at('2099-01-20T18:00:00Z')).toBe('results');
  });

  it('is null for a meetup, or a hackathon without its details yet', () => {
    expect(
      hackathonScheduleOf({ ...event, kind: 'meetup' }, row, 0),
    ).toBeNull();
    expect(hackathonScheduleOf(event, null, 0)).toBeNull();
  });
});
