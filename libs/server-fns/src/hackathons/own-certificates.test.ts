import { beforeEach, describe, expect, it } from 'vitest';

import { and, eq, hackathonCertificates, type Db } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { captain, unwrap } from './judging.fixtures.js';
import { judgePageResolver } from './judge-page.js';
import { setHackathons } from './registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
  type JudgingTwoEntries,
} from './results.fixtures.js';
import { publishHackathonResultsResolver } from './results.js';
import { teamPageResolver } from './team-page.js';

let db: Db;

const operator = members[3]?.id ?? '';

const judged = async (): Promise<JudgingTwoEntries> => {
  const setup = await judgingTwoEntries(db);
  await scoreBoth(db, setup);
  await judgingEnded(db, setup.eventId);
  return setup;
};

const publish = async ({ eventId }: JudgingTwoEntries) =>
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId }),
      actorUserId: operator,
    }),
  );

describe('a member’s certificates on their pages (B-CRT-03, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows the team page none before the results, then the member’s own', async () => {
    const setup = await judged();
    const page = async () =>
      unwrap(
        await teamPageResolver(db, {
          eventId: setup.eventId,
          userId: captain,
        }),
      ).certificates;
    expect(await page()).toEqual([]);

    await publish(setup);

    const issued = await db
      .select({
        code: hackathonCertificates.verificationCode,
        userId: hackathonCertificates.userId,
      })
      .from(hackathonCertificates)
      .where(eq(hackathonCertificates.eventId, setup.eventId));
    const own = issued.filter(({ userId }) => userId === captain);
    expect(own.length).toBeGreaterThan(0);
    expect((await page()).map(({ code }) => code).sort()).toEqual(
      own.map(({ code }) => code).sort(),
    );
  });

  it('leaves a revoked certificate out', async () => {
    const setup = await judged();
    await publish(setup);
    await db
      .update(hackathonCertificates)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(hackathonCertificates.eventId, setup.eventId),
          eq(hackathonCertificates.userId, captain),
        ),
      );

    expect(
      unwrap(
        await teamPageResolver(db, {
          eventId: setup.eventId,
          userId: captain,
        }),
      ).certificates,
    ).toEqual([]);
  });

  it('shows a judge theirs on the judge page, and nobody else any', async () => {
    const setup = await judged();
    const page = async (userId: string) =>
      unwrap(await judgePageResolver(db, { eventId: setup.eventId, userId }));
    expect((await page(setup.judge.userId)).certificates).toEqual([]);

    await publish(setup);

    expect((await page(setup.judge.userId)).certificates).toEqual([
      expect.objectContaining({ kind: 'judge', placement: null }),
    ]);
    expect((await page(captain)).certificates).toEqual([]);
  });
});
