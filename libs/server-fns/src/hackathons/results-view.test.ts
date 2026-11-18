import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  events,
  hackathonCriteria,
  hackathonResults,
  hackathonScores,
  hackathonSubmissions,
  hackathonTeams,
  listHackathonResults,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
} from './results.fixtures.js';
import {
  hackathonResultsResolver,
  publishHackathonResultsResolver,
} from './results.js';

let db: Db;

const publish = (input: { eventId: string; tieOrder: string[] }) =>
  publishHackathonResultsResolver(db, null, {
    ...hackathons.publishResultsSchema.parse(input),
    actorUserId: members[3]?.id ?? '',
  });

describe('a hackathon’s results for its organisers, and after they freeze (B-JDG-09, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows organisers nothing before judging ends, then what they would publish, then what is frozen', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, rival } = setup;
    await scoreBoth(db, setup, true);

    const view = async () =>
      unwrap(await hackathonResultsResolver(db, eventId));

    expect(await view()).toMatchObject({
      stage: 'waiting',
      publishedAt: null,
      entries: [],
      tiedGroups: [],
    });

    await judgingEnded(db, eventId);
    const open = await view();
    expect(open.stage).toBe('open');
    expect(open.missingEntries).toEqual([]);
    expect(open.tiedGroups).toEqual([
      expect.arrayContaining([submissionId, rival.submissionId]),
    ]);
    expect(open.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ submissionId, rank: 1, isTied: true }),
      ]),
    );

    unwrap(
      await publish({
        eventId,
        tieOrder: [submissionId, rival.submissionId],
      }),
    );
    const published = await view();
    expect(published.stage).toBe('published');
    expect(published.publishedAt).toEqual(expect.any(Number));
    expect(published.tiedGroups).toEqual([]);
    expect(published.entries).toMatchObject([
      { submissionId, rank: 1, isTied: false, tieNote: 'organiser_pick' },
      { submissionId: rival.submissionId, rank: 2 },
    ]);
  });

  it('calls a cancelled hackathon unavailable', async () => {
    const { eventId } = await judgingTwoEntries(db);
    await db
      .update(events)
      .set({ status: 'cancelled' })
      .where(eq(events.id, eventId));

    expect(unwrap(await hackathonResultsResolver(db, eventId)).stage).toBe(
      'unavailable',
    );
  });

  it('keeps the frozen results when the team, criteria or scores change later', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, criteria, judge } = setup;
    await scoreBoth(db, setup);
    await judgingEnded(db, eventId);
    unwrap(await publish({ eventId, tieOrder: [] }));
    const before = await listHackathonResults(db, eventId);

    await db
      .update(hackathonTeams)
      .set({ name: 'Renamed' })
      .where(eq(hackathonTeams.id, setup.rival.teamId));
    await db
      .update(hackathonCriteria)
      .set({ name: 'Renamed', weight: 1 })
      .where(eq(hackathonCriteria.id, criteria.impact));
    await db
      .update(hackathonScores)
      .set({ value: 1 })
      .where(eq(hackathonScores.judgeId, judge.judgeId));
    await db
      .delete(hackathonSubmissions)
      .where(eq(hackathonSubmissions.id, submissionId));

    expect(await listHackathonResults(db, eventId)).toEqual(before);
    expect(
      await db
        .select({ id: hackathonResults.submissionId })
        .from(hackathonResults)
        .where(eq(hackathonResults.submissionId, submissionId)),
    ).toHaveLength(1);
  });
});
