import { inArray } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  and,
  dismissReportTarget,
  disqualifyReportedTeam,
  eq,
  hackathonReports,
  hackathonSubmissions,
  operationsAudit,
  scheduledNotifications,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { id } from '@founders-coffee/core';
import {
  captain,
  codeOf,
  member,
  submitted,
  unwrap,
} from '../hackathons/judging.fixtures.js';
import { setHackathons } from '../hackathons/registration.fixtures.js';
import { reportHackathonTargetResolver } from '../hackathons/reports.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import {
  decideReportResolver,
  listReportQueueResolver,
} from './hackathon-reports.js';

let db: Db;

const [, , outsider, operator] = members.map((row) => row.id) as [
  string,
  string,
  string,
  string,
];

const REASON = 'The code was copied from another team’s public repository.';
const EVIDENCE =
  'https://github.com/other-team/ledger, first commit 3 days earlier';

const reported = async () => {
  const { eventId, submissionId } = await submitted(db);
  const [entry] = await db
    .select({ teamId: hackathonSubmissions.teamId })
    .from(hackathonSubmissions)
    .where(eq(hackathonSubmissions.id, submissionId));
  const teamId = entry?.teamId ?? '';
  const report = (targetType: 'submission' | 'team', targetId: string) =>
    reportHackathonTargetResolver(db, {
      eventId,
      targetType,
      targetId,
      reason: 'plagiarism',
      reporterId: outsider,
    });
  unwrap(await report('submission', submissionId));
  unwrap(await report('team', teamId));
  return { eventId, submissionId, teamId };
};

const decide = (decision: object) =>
  decideReportResolver(db, {
    decision: hackathons.reportDecisionSchema.parse(decision),
    actorUserId: operator,
    accessSubject: 'operator@founders.coffee',
  });

const reportsOf = (targetIds: readonly string[]) =>
  db
    .select({
      targetType: hackathonReports.targetType,
      status: hackathonReports.status,
      reviewedBy: hackathonReports.reviewedBy,
      decisionReason: hackathonReports.decisionReason,
      evidence: hackathonReports.evidence,
    })
    .from(hackathonReports)
    .where(inArray(hackathonReports.targetId, [...targetIds]));

const auditsOf = (targetId: string) =>
  db
    .select({
      action: operationsAudit.action,
      accessSubject: operationsAudit.accessSubject,
    })
    .from(operationsAudit)
    .where(eq(operationsAudit.targetId, targetId));

describe('the reports queue and its decisions (B-SAFE-02, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('lists each reported target once, with its team, entry and reasons', async () => {
    const { submissionId, teamId } = await reported();

    const queue = unwrap(await listReportQueueResolver(db, 0));
    const mine = queue.items.filter((item) => item.teamId === teamId);
    expect(mine).toEqual([
      expect.objectContaining({
        targetType: 'submission',
        targetId: submissionId,
        teamName: 'Byte Club',
        reports: 1,
        reasons: ['plagiarism'],
        entry: expect.objectContaining({
          submissionId,
          status: 'submitted',
          title: 'Ledger',
          repositoryUrl: 'https://github.com/byte-club/ledger',
        }),
      }),
      expect.objectContaining({ targetType: 'team', targetId: teamId }),
    ]);
  });

  it('dismisses one target’s reports, audited, and refuses deciding them again', async () => {
    const { submissionId, teamId } = await reported();

    expect(
      unwrap(
        await decide({
          targetType: 'submission',
          targetId: submissionId,
          decision: 'dismiss',
        }),
      ),
    ).toEqual({ decision: 'dismiss', reports: 1 });
    expect(await reportsOf([submissionId, teamId])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: 'submission',
          status: 'dismissed',
          reviewedBy: operator,
          decisionReason: null,
        }),
        expect.objectContaining({ targetType: 'team', status: 'open' }),
      ]),
    );
    expect(await auditsOf(submissionId)).toEqual([
      { action: 'dismissed', accessSubject: 'operator@founders.coffee' },
    ]);
    expect(
      codeOf(
        await decide({
          targetType: 'submission',
          targetId: submissionId,
          decision: 'disqualify',
          reason: REASON,
          evidence: EVIDENCE,
        }),
      ),
    ).toBe('report_decided');
  });

  it('disqualifies the team: every open report decided with the reason, the entry locked, the team told', async () => {
    const { eventId, submissionId, teamId } = await reported();

    expect(
      unwrap(
        await decide({
          targetType: 'team',
          targetId: teamId,
          decision: 'disqualify',
          reason: REASON,
          evidence: EVIDENCE,
        }),
      ),
    ).toEqual({ decision: 'disqualify', reports: 2 });

    expect(await reportsOf([submissionId, teamId])).toEqual([
      expect.objectContaining({
        status: 'disqualified',
        decisionReason: REASON,
        evidence: EVIDENCE,
      }),
      expect.objectContaining({
        status: 'disqualified',
        decisionReason: REASON,
        evidence: EVIDENCE,
      }),
    ]);
    const [entry] = await db
      .select({ status: hackathonSubmissions.status })
      .from(hackathonSubmissions)
      .where(eq(hackathonSubmissions.id, submissionId));
    expect(entry?.status).toBe('disqualified');
    expect(await auditsOf(teamId)).toEqual([
      { action: 'disqualified', accessSubject: 'operator@founders.coffee' },
    ]);

    const notices = await db
      .select({
        userId: scheduledNotifications.userId,
        payload: scheduledNotifications.payload,
      })
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.eventId, eventId),
          eq(scheduledNotifications.templateKey, 'hackathon_team_disqualified'),
        ),
      );
    expect(notices.map((notice) => notice.userId).sort()).toEqual(
      [captain, member].sort(),
    );
    expect((notices[0]?.payload as { pushBody: string }).pushBody).toContain(
      REASON,
    );

    expect(
      codeOf(
        await decide({
          targetType: 'submission',
          targetId: submissionId,
          decision: 'dismiss',
        }),
      ),
    ).toBe('report_decided');
    expect(await auditsOf(teamId)).toHaveLength(1);
  });

  it('refuses a target nobody reported', async () => {
    const { teamId } = await reported();

    expect(
      codeOf(
        await decide({
          targetType: 'submission',
          targetId: teamId.replace('tea_', 'sub_'),
          decision: 'dismiss',
        }),
      ),
    ).toBe('report_not_found');
  });

  it('writes nothing, not even an audit entry, when the batch finds the reports decided already', async () => {
    const { eventId, submissionId, teamId } = await reported();
    const decision = {
      targetType: 'team' as const,
      targetId: teamId,
      eventId,
      actorUserId: operator,
      accessSubject: null,
      teamId,
      reason: REASON,
      evidence: EVIDENCE,
    };
    await disqualifyReportedTeam(db, { ...decision, auditId: id('aud') });

    expect(
      await disqualifyReportedTeam(db, { ...decision, auditId: id('aud') }),
    ).toEqual({ reports: 0, entries: 0 });
    expect(
      await dismissReportTarget(db, {
        ...decision,
        targetType: 'submission',
        targetId: submissionId,
        auditId: id('aud'),
      }),
    ).toBe(0);
    expect(await auditsOf(teamId)).toHaveLength(1);
    expect(await auditsOf(submissionId)).toEqual([]);
  });
});
