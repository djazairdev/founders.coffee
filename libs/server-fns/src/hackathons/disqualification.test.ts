import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  eq,
  hackathonCertificates,
  hackathonResults,
  hackathonSubmissions,
  listJudgeEntries,
  listResultsEntries,
  projects as projectRows,
  publishResults,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { decideReportResolver } from '../admin/hackathon-reports.js';
import {
  confirmProjectListingResolver,
  createProjectFromEntryResolver,
  publishProjectResolver,
} from '../projects/from-entry.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { captain, member, unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import { reportHackathonTargetResolver } from './reports.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scored,
  scoreBoth,
  type JudgingTwoEntries,
} from './results.fixtures.js';
import {
  hackathonResultsResolver,
  publishHackathonResultsResolver,
} from './results.js';

let db: Db;

const [, , outsider, operator] = members.map((row) => row.id) as [
  string,
  string,
  string,
  string,
];

const publish = async (eventId: string) => {
  await judgingEnded(db, eventId);
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId }),
      actorUserId: operator,
    }),
  );
};

const disqualify = async ({ eventId, submissionId }: JudgingTwoEntries) => {
  unwrap(
    await reportHackathonTargetResolver(db, {
      eventId,
      targetType: 'submission',
      targetId: submissionId,
      reason: 'plagiarism',
      reporterId: outsider,
    }),
  );
  unwrap(
    await decideReportResolver(db, {
      decision: hackathons.reportDecisionSchema.parse({
        targetType: 'submission',
        targetId: submissionId,
        decision: 'disqualify',
        reason: 'The code was copied from another team.',
        evidence: 'https://github.com/other-team/ledger',
      }),
      actorUserId: operator,
      accessSubject: 'operator@founders.coffee',
    }),
  );
};

const frozen = async (eventId: string) =>
  db
    .select({
      submissionId: hackathonResults.submissionId,
      rank: hackathonResults.rank,
      disqualifiedAt: hackathonResults.disqualifiedAt,
    })
    .from(hackathonResults)
    .where(eq(hackathonResults.eventId, eventId));

describe('what disqualification changes (B-SAFE-03, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('before the results: the entry leaves judging and the results, and its team earns nothing', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, rival, judge, criteria } = setup;
    await disqualify(setup);

    const entries = await listResultsEntries(db, eventId);
    expect(entries.map((entry) => entry.submissionId)).toEqual([
      rival.submissionId,
    ]);
    const judged = await listJudgeEntries(db, {
      eventId,
      judgeId: judge.judgeId,
    });
    expect(judged.map((entry) => entry.submissionId)).toEqual([
      rival.submissionId,
    ]);

    await scored(db, eventId, judge.judgeId, rival.submissionId, {
      [criteria.impact]: 5,
      [criteria.craft]: 3,
    });
    await publish(eventId);

    const rows = await frozen(eventId);
    expect(rows.map((row) => row.submissionId)).toEqual([rival.submissionId]);
    expect(rows.map((row) => row.submissionId)).not.toContain(submissionId);
    const certificates = await db
      .select({ userId: hackathonCertificates.userId })
      .from(hackathonCertificates)
      .where(eq(hackathonCertificates.eventId, eventId));
    expect(certificates.map((row) => row.userId)).not.toContain(captain);
    expect(certificates.map((row) => row.userId)).not.toContain(member);
  });

  it('after the results: the entry is marked and keeps its rank, for the organiser to decide its prize', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, rival } = setup;
    await scoreBoth(db, setup);
    await publish(eventId);

    await disqualify(setup);

    const rows = await frozen(eventId);
    expect(rows.find((row) => row.submissionId === submissionId)).toMatchObject(
      { rank: 1, disqualifiedAt: expect.any(Date) },
    );
    expect(
      rows.find((row) => row.submissionId === rival.submissionId),
    ).toMatchObject({ rank: 2, disqualifiedAt: null });

    const view = unwrap(await hackathonResultsResolver(db, eventId));
    expect(
      view.entries.map((entry) => [entry.submissionId, entry.isDisqualified]),
    ).toEqual([
      [submissionId, true],
      [rival.submissionId, false],
    ]);
  });

  it('after the results: a published project made from the entry is hidden and cannot come back', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId } = setup;
    await scoreBoth(db, setup);
    await publish(eventId);
    const { projectId } = unwrap(
      await createProjectFromEntryResolver(db, null, {
        eventId,
        userId: captain,
      }),
    );
    unwrap(
      await confirmProjectListingResolver(db, { projectId, userId: member }),
    );
    unwrap(
      await publishProjectResolver(db, null, { projectId, userId: captain }),
    );

    await disqualify(setup);

    const [project] = await db
      .select({ status: projectRows.status, version: projectRows.version })
      .from(projectRows)
      .where(eq(projectRows.id, projectId));
    expect(project).toEqual({ status: 'hidden', version: 3 });
    expect(
      (await publishProjectResolver(db, null, { projectId, userId: captain }))
        .ok,
    ).toBe(false);
  });

  it('an entry disqualified just as the results go out is marked, and its team’s certificates revoked', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId } = setup;
    await judgingEnded(db, eventId);
    const entries = await listResultsEntries(db, eventId);
    await db
      .update(hackathonSubmissions)
      .set({ status: 'disqualified' })
      .where(eq(hackathonSubmissions.id, submissionId));

    expect(
      await publishResults(db, {
        eventId,
        actorUserId: operator,
        auditId: id('aud'),
        publishedAt: new Date(),
        results: entries.map((entry, index) => ({
          ...entry,
          total: 50,
          rank: index + 1,
          trackRank: index + 1,
          tieNote: null,
          criteria: [],
        })),
        certificates: [
          {
            id: id('cer'),
            userId: captain,
            kind: 'participant',
            placement: null,
            verificationCode: id('cod'),
          },
        ],
        awards: [],
        metadata: {},
      }),
    ).toBe(true);

    const rows = await frozen(eventId);
    expect(
      rows.find((row) => row.submissionId === submissionId)?.disqualifiedAt,
    ).toEqual(expect.any(Date));
    const [certificate] = await db
      .select({ revokedAt: hackathonCertificates.revokedAt })
      .from(hackathonCertificates)
      .where(eq(hackathonCertificates.userId, captain));
    expect(certificate?.revokedAt).toEqual(expect.any(Date));
  });
});
