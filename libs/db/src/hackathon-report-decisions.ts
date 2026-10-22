import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import type { ReportedTarget } from './hackathon-report-review.js';
import { auditStatement } from './operations-audit.js';
import { events, hackathonReports, hackathonSubmissions } from './schema.js';

type Decision = ReportedTarget & {
  readonly eventId: string;
  readonly actorUserId: string;
  readonly accessSubject: string | null;
  readonly auditId: string;
};

const openOn = (target: ReportedTarget) =>
  and(
    eq(hackathonReports.targetType, target.targetType),
    eq(hackathonReports.targetId, target.targetId),
    eq(hackathonReports.status, 'open'),
  );

const wholeSeconds = (moment: number) => Math.floor(moment / 1000);

/**
 * Dismiss the open reports about an entry or a team (B-SAFE-02), with its audit entry, in one
 * batch; the audit lands only when a report did. Returns how many were dismissed: none when
 * another administrator decided them first.
 */
export const dismissReportTarget = async (
  db: Db,
  input: Decision,
): Promise<number> => {
  const [dismissed] = await batch(db, [
    db
      .update(hackathonReports)
      .set({
        status: 'dismissed',
        reviewedBy: input.actorUserId,
        reviewedAt: new Date(),
      })
      .where(openOn(input))
      .returning({ id: hackathonReports.id }),
    auditStatement(
      db,
      {
        id: input.auditId,
        actorUserId: input.actorUserId,
        accessSubject: input.accessSubject,
        action: 'dismissed',
        targetType: input.targetType,
        targetId: input.targetId,
        reasonCode: null,
        metadata: {},
      },
      events,
      events.marketCode,
      and(eq(events.id, input.eventId), sql`changes() > 0`),
    ),
  ]);
  return (dismissed as readonly unknown[]).length;
};

/**
 * Disqualify the team behind a reported entry or team (B-SAFE-02), in one batch: the target's open
 * reports are decided with the reason and evidence and audited, then every other open report about
 * the team or its entry is decided the same way and the entry it submitted is marked disqualified.
 * Only the first statement checks that the target is still open; the audit follows its `changes()`
 * and the rest the row it wrote, read by its reviewer and second, so nothing lands when another
 * administrator decided first.
 */
export const disqualifyReportedTeam = async (
  db: Db,
  input: Decision & {
    readonly teamId: string;
    readonly reason: string;
    readonly evidence: string;
  },
): Promise<{ readonly reports: number; readonly entries: number }> => {
  const decidedAt = wholeSeconds(Date.now());
  const isThisDecision: SQL = sql`EXISTS (SELECT 1 FROM hackathon_reports AS decided WHERE decided.target_type = ${input.targetType} AND decided.target_id = ${input.targetId} AND decided.status = 'disqualified' AND decided.reviewed_by = ${input.actorUserId} AND decided.reviewed_at = ${decidedAt})`;
  const decision = {
    status: 'disqualified' as const,
    reviewedBy: input.actorUserId,
    reviewedAt: new Date(decidedAt * 1000),
    decisionReason: input.reason,
    evidence: input.evidence,
  };
  const teamEntries = db
    .select({ id: hackathonSubmissions.id })
    .from(hackathonSubmissions)
    .where(eq(hackathonSubmissions.teamId, input.teamId));
  const [target, , others, entries] = await batch(db, [
    db
      .update(hackathonReports)
      .set(decision)
      .where(openOn(input))
      .returning({ id: hackathonReports.id }),
    auditStatement(
      db,
      {
        id: input.auditId,
        actorUserId: input.actorUserId,
        accessSubject: input.accessSubject,
        action: 'disqualified',
        targetType: 'team',
        targetId: input.teamId,
        reasonCode: null,
        metadata: { reportedTarget: input.targetType },
      },
      events,
      events.marketCode,
      and(eq(events.id, input.eventId), sql`changes() > 0`),
    ),
    db
      .update(hackathonReports)
      .set(decision)
      .where(
        and(
          eq(hackathonReports.status, 'open'),
          or(
            and(
              eq(hackathonReports.targetType, 'team'),
              eq(hackathonReports.targetId, input.teamId),
            ),
            and(
              eq(hackathonReports.targetType, 'submission'),
              inArray(hackathonReports.targetId, teamEntries),
            ),
          ),
          isThisDecision,
        ),
      )
      .returning({ id: hackathonReports.id }),
    db
      .update(hackathonSubmissions)
      .set({ status: 'disqualified', updatedAt: new Date() })
      .where(
        and(
          eq(hackathonSubmissions.teamId, input.teamId),
          eq(hackathonSubmissions.eventId, input.eventId),
          eq(hackathonSubmissions.status, 'submitted'),
          isThisDecision,
        ),
      )
      .returning({ id: hackathonSubmissions.id }),
  ]);
  const count = (rows: unknown) => (rows as readonly unknown[]).length;
  const decided = count(target);
  return {
    reports: decided === 0 ? 0 : decided + count(others),
    entries: count(entries),
  };
};
