import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  and,
  deleteExpiredHackathonReports,
  eq,
  hackathonReports,
  reportHackathonTarget,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import { reportHackathonTargetResolver } from './reports.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { submitSubmissionResolver } from './submission-submit.js';
import { building } from './submission.fixtures.js';

let db: Db;

const MONTH = 30 * 24 * 3_600_000;
const [captain, mate, outsider] = members.map((row) => row.id) as [
  string,
  string,
  string,
];

const unwrap = <T>(
  result: { ok: true; data: T } | { ok: false; error: Error },
) => {
  if (!result.ok) throw result.error;
  return result.data;
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

/** A building team whose captain saved its project, submitted it if `isSubmitted`. */
const entry = async (isSubmitted = true) => {
  const { eventId, teamId, trackId } = await building(db, [captain, mate]);
  const draft = unwrap(
    await saveSubmissionDraftResolver(db, {
      eventId,
      userId: captain,
      version: 0,
      draft: hackathons.submissionDraftSchema.parse({
        trackId,
        title: 'Ledger',
        description: 'A ledger a corner shop keeps on its phone.',
        repositoryUrl: 'https://github.com/byte-club/ledger',
        aiStatement: 'We wrote every line ourselves and used no AI tools.',
      }),
    }),
  );
  if (!isSubmitted)
    return { eventId, teamId, submissionId: draft.submissionId };
  const sent = unwrap(
    await submitSubmissionResolver(db, null, {
      eventId,
      userId: captain,
      version: draft.version,
    }),
  );
  return { eventId, teamId, submissionId: sent.submissionId };
};

const report = (
  eventId: string,
  target: { targetType: 'submission' | 'team'; targetId: string },
  reporterId = outsider,
) =>
  reportHackathonTargetResolver(db, {
    eventId,
    ...target,
    reason: 'plagiarism',
    reporterId,
  });

const reportsOf = (targetId: string) =>
  db
    .select()
    .from(hackathonReports)
    .where(eq(hackathonReports.targetId, targetId));

describe('reporting an entry or a team (B-SAFE-01, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('files one report per member about a submitted entry, open, in the hackathon’s market', async () => {
    const { eventId, submissionId } = await entry();
    const target = {
      targetType: 'submission' as const,
      targetId: submissionId,
    };

    expect(unwrap(await report(eventId, target))).toEqual({ reported: true });
    expect(codeOf(await report(eventId, target))).toBe('already_reported');
    expect(await reportsOf(submissionId)).toEqual([
      expect.objectContaining({
        eventId,
        marketCode: 'DZ',
        targetType: 'submission',
        reporterId: outsider,
        reason: 'plagiarism',
        status: 'open',
        reviewedAt: null,
      }),
    ]);
  });

  it('files a report about a team, but never one by its own members', async () => {
    const { eventId, teamId, submissionId } = await entry();
    const team = { targetType: 'team' as const, targetId: teamId };

    expect((await report(eventId, team)).ok).toBe(true);
    expect(codeOf(await report(eventId, team, mate))).toBe('own_team_report');
    expect(
      codeOf(
        await report(
          eventId,
          { targetType: 'submission', targetId: submissionId },
          captain,
        ),
      ),
    ).toBe('own_team_report');
  });

  it('finds nothing to report in a draft, an unknown team, or another hackathon’s entry', async () => {
    const draft = await entry(false);
    const other = await entry();

    expect(
      codeOf(
        await report(draft.eventId, {
          targetType: 'submission',
          targetId: draft.submissionId,
        }),
      ),
    ).toBe('report_target_not_found');
    expect(
      codeOf(
        await report(draft.eventId, {
          targetType: 'team',
          targetId: id('team'),
        }),
      ),
    ).toBe('report_target_not_found');
    expect(
      codeOf(
        await report(draft.eventId, {
          targetType: 'submission',
          targetId: other.submissionId,
        }),
      ),
    ).toBe('report_target_not_found');
  });

  it('writes nothing when the batch’s own check refuses a team member', async () => {
    const { eventId, teamId } = await entry();

    expect(
      await reportHackathonTarget(db, {
        id: id('rpt'),
        eventId,
        targetType: 'team',
        targetId: teamId,
        reporterId: mate,
        reason: 'spam',
      }),
    ).toBe('refused');
    expect(await reportsOf(teamId)).toEqual([]);
  });

  it('deletes a report 24 months after its decision, and never an open one', async () => {
    const { eventId, teamId, submissionId } = await entry();
    unwrap(await report(eventId, { targetType: 'team', targetId: teamId }));
    unwrap(
      await report(eventId, {
        targetType: 'submission',
        targetId: submissionId,
      }),
    );
    const now = new Date(Date.now() + 30 * MONTH);
    await db
      .update(hackathonReports)
      .set({
        status: 'dismissed',
        reviewedBy: captain,
        reviewedAt: new Date(now.getTime() - 25 * MONTH),
      })
      .where(
        and(
          eq(hackathonReports.targetId, teamId),
          eq(hackathonReports.eventId, eventId),
        ),
      );

    expect(await deleteExpiredHackathonReports(db, { now, limit: 10 })).toBe(1);
    expect(await reportsOf(teamId)).toEqual([]);
    expect(await reportsOf(submissionId)).toHaveLength(1);
  });
});
