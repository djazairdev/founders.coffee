import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  eq,
  hackathonCertificates,
  hackathonPrizes,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { decideReportResolver } from '../admin/hackathon-reports.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { captain, judgeOf, member, unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import { reportHackathonTargetResolver } from './reports.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
  type JudgingTwoEntries,
} from './results.fixtures.js';
import { publishHackathonResultsResolver } from './results.js';

let db: Db;

const [, , outsider, operator] = members.map((row) => row.id) as [
  string,
  string,
  string,
  string,
];

const publish = async (eventId: string, missingScoresReason?: string) => {
  await judgingEnded(db, eventId);
  return publishHackathonResultsResolver(db, null, {
    ...hackathons.publishResultsSchema.parse({ eventId, missingScoresReason }),
    actorUserId: operator,
  });
};

const certificatesOf = (eventId: string) =>
  db
    .select()
    .from(hackathonCertificates)
    .where(eq(hackathonCertificates.eventId, eventId));

const addPrize = async (setup: JudgingTwoEntries) => {
  const now = new Date();
  await db.insert(hackathonPrizes).values({
    id: id('prz'),
    eventId: setup.eventId,
    place: 1,
    title: 'First prize',
    description: 'For the best project overall.',
    providerName: 'Founders Coffee',
    confirmationNote: 'Confirmed by email.',
    confirmedAt: now,
  });
};

const summary = (rows: Awaited<ReturnType<typeof certificatesOf>>) =>
  rows.map((row) => [row.userId, row.kind, row.placement].join(':')).sort();

describe('certificates from the results (B-CRT-01, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('issues them with the results, each with its own random code', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await addPrize(setup);

    unwrap(await publish(setup.eventId));

    const rows = await certificatesOf(setup.eventId);
    expect(summary(rows)).toEqual(
      [
        `${captain}:participant:`,
        `${member}:participant:`,
        `${captain}:winner:First prize`,
        `${member}:winner:First prize`,
        `${setup.judge.userId}:judge:`,
      ].sort(),
    );
    expect(new Set(rows.map((row) => row.verificationCode)).size).toBe(
      rows.length,
    );
    expect(rows[0]?.verificationCode).toMatch(/^[0-9a-f]{32}$/u);
    expect(rows.every((row) => row.revokedAt === null)).toBe(true);
  });

  it('gives nothing to a judge who did not finish', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    const unfinished = await judgeOf(db, setup.eventId);

    unwrap(await publish(setup.eventId, 'One judge fell ill.'));

    const rows = await certificatesOf(setup.eventId);
    expect(rows.map((row) => row.userId)).not.toContain(unfinished.userId);
  });

  it('issues them once: a second try is refused and writes nothing', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    unwrap(await publish(setup.eventId));
    const first = await certificatesOf(setup.eventId);

    const again = await publish(setup.eventId);

    expect(again.ok).toBe(false);
    expect(await certificatesOf(setup.eventId)).toEqual(first);
  });

  it('revokes what a disqualified team earned, and leaves the judge’s', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, judge } = setup;
    await scoreBoth(db, setup);
    await addPrize(setup);
    unwrap(await publish(eventId));
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

    const rows = await certificatesOf(eventId);
    const revoked = rows.filter((row) => row.revokedAt !== null);
    expect(summary(revoked)).toEqual(
      [
        `${captain}:participant:`,
        `${member}:participant:`,
        `${captain}:winner:First prize`,
        `${member}:winner:First prize`,
      ].sort(),
    );
    expect(rows.find((row) => row.kind === 'judge')?.userId).toBe(judge.userId);
    expect(rows.find((row) => row.kind === 'judge')?.revokedAt).toBeNull();
  });
});
