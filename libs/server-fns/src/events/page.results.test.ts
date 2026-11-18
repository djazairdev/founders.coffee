import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  events,
  hackathonPullRequests,
  hackathonSubmissionVersions,
  hackathonTeams,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { unwrap } from '../hackathons/judging.fixtures.js';
import { setHackathons } from '../hackathons/registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
} from '../hackathons/results.fixtures.js';
import { publishHackathonResultsResolver } from '../hackathons/results.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { readEventPage } from './page.js';

let db: Db;

const pageOf = async (eventId: string) => {
  const [row] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, eventId));
  return unwrap(
    await readEventPage(
      db,
      { marketCode: 'DZ', slug: row?.slug ?? '' },
      Promise.resolve(undefined),
    ),
  );
};

const publish = (eventId: string) =>
  publishHackathonResultsResolver(db, null, {
    ...hackathons.publishResultsSchema.parse({ eventId }),
    actorUserId: members[3]?.id ?? '',
  });

describe('a hackathon’s results on its page (B-JDG-10, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows nothing until the results are published', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await judgingEnded(db, setup.eventId);

    expect((await pageOf(setup.eventId)).results).toBeNull();
  });

  it('shows the frozen ranks with each criterion’s score and pull requests as recorded', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, rival, trackId, criteria } = setup;
    const url = 'https://github.com/acme/ledger/pull/7';
    await db
      .update(hackathonSubmissionVersions)
      .set({ pullRequestUrls: [url] })
      .where(eq(hackathonSubmissionVersions.submissionId, rival.submissionId));
    await db
      .insert(hackathonPullRequests)
      .values({ submissionId: rival.submissionId, url, status: 'merged' });
    await scoreBoth(db, setup);
    await judgingEnded(db, eventId);
    unwrap(await publish(eventId));

    const { results } = await pageOf(eventId);

    expect(results?.overall).toMatchObject([
      { submissionId, rank: 1, total: 80, pullRequests: [] },
      {
        submissionId: rival.submissionId,
        rank: 2,
        pullRequests: [{ url, status: 'merged' }],
      },
    ]);
    expect(results?.overall[0]?.criteria).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          criterionId: criteria.impact,
          name: 'Impact',
          mean: 8,
          scale: 10,
        }),
      ]),
    );
    expect(results?.tracks).toMatchObject([
      {
        trackId,
        title: 'Payments',
        entries: [{ trackRank: 1 }, { trackRank: 2 }],
      },
    ]);
    expect(JSON.stringify(results)).not.toContain(setup.judge.judgeId);
  });

  it('keeps showing what was frozen after the team is renamed', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await judgingEnded(db, setup.eventId);
    unwrap(await publish(setup.eventId));

    await db
      .update(hackathonTeams)
      .set({ name: 'Renamed' })
      .where(eq(hackathonTeams.id, setup.rival.teamId));

    expect((await pageOf(setup.eventId)).results?.overall[1]?.teamName).toBe(
      'Souk Squad',
    );
  });
});
