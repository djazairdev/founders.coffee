import { describe, expect, it } from 'vitest';

import {
  eq,
  eventOrganisers,
  events,
  organization,
  user,
  type Db,
} from '@founders-coffee/db';

import {
  DAY,
  HOUR,
  hackathonWithDetails,
  ORGANISATION,
  setupHackathonDb,
} from '../hackathons/edit.fixtures.js';
import {
  answerJudgeInviteResolver,
  createJudgeInviteResolver,
} from '../hackathons/judges.js';
import { hackathonScheduleOf } from './hackathon-schedule.js';
import { readEventPage } from './page.js';
import { createTestEvent, TEST_HOST_ID } from './resolver.fixtures.js';

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

  it('names the judges who accepted, while they may be shown (B-JDG-03)', async () => {
    const db = await setupHackathonDb();
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const judges = ['usr_page_judge_a', 'usr_page_judge_b', 'usr_page_judge_c'];
    await db.insert(user).values(
      judges.map((userId, index) => ({
        id: userId,
        name: `Page Judge ${index}`,
        email: `${userId}@judges.test`,
        emailVerified: true,
        role: 'member' as const,
      })),
    );
    for (const [index, userId] of judges.entries()) {
      const made = await createJudgeInviteResolver(db, {
        eventId,
        userId: TEST_HOST_ID,
        organisationId: ORGANISATION,
      });
      if (!made.ok) throw made.error;
      if (index < 2)
        await answerJudgeInviteResolver(db, {
          token: made.data.token,
          answer: 'accept',
          userId,
        });
    }
    await db
      .update(user)
      .set({ banned: true })
      .where(eq(user.id, 'usr_page_judge_b'));

    const page = await readEventPage(
      db,
      { marketCode: 'DZ', slug: await slugOf(db, eventId) },
      anonymous(),
    );

    if (!page.ok) throw page.error;
    expect(page.data.judges).toEqual([
      { userId: 'usr_page_judge_a', name: 'Page Judge 0', photoAssetId: null },
    ]);
  });

  it('names the organisations that run it, the lead first (B-HKN-24)', async () => {
    const db = await setupHackathonDb();
    const { eventId } = await hackathonWithDetails(db, {}, true);
    await db.insert(organization).values({
      id: 'org_aaa_cohost',
      name: 'AAA Co-hosts',
      slug: 'aaa-co-hosts',
      kind: 'club',
      status: 'approved',
      marketCode: 'DZ',
      description: 'A club that co-hosts the hackathon.',
    });
    await db
      .insert(eventOrganisers)
      .values({ eventId, organisationId: 'org_aaa_cohost', role: 'co_host' });

    const page = await readEventPage(
      db,
      { marketCode: 'DZ', slug: await slugOf(db, eventId) },
      anonymous(),
    );

    if (!page.ok) throw page.error;
    expect(page.data.organisations).toEqual([
      { name: 'Algiers Builders', slug: 'algiers-builders' },
      { name: 'AAA Co-hosts', slug: 'aaa-co-hosts' },
    ]);
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
    expect(page.data.judges).toEqual([]);
    expect(page.data.organisations).toEqual([]);
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
