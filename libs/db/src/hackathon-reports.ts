import { and, eq, inArray, isNotNull, lt, sql, type SQL } from 'drizzle-orm';

import {
  HACKATHON_REPORT_KEPT_MONTHS,
  type HackathonReportReason,
  type HackathonReportTarget,
} from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import {
  events,
  hackathonReports,
  hackathonSubmissions,
  hackathonTeamMembers,
  hackathonTeams,
} from './schema.js';

type Target = {
  readonly eventId: string;
  readonly targetType: HackathonReportTarget;
  readonly targetId: string;
  readonly reporterId: string;
};

export type ReportTargetStanding = {
  readonly isReporterInTeam: boolean;
  readonly hasReported: boolean;
};

export type HackathonReportOutcome =
  'reported' | 'already_reported' | 'refused';

const teamOf = (input: Target): SQL =>
  input.targetType === 'team'
    ? sql`${input.targetId}`
    : sql`(SELECT ${hackathonSubmissions.teamId} FROM ${hackathonSubmissions} WHERE ${hackathonSubmissions.id} = ${input.targetId})`;

const reportable = (input: Target): SQL =>
  sql`${events.status} = 'published' AND ${
    input.targetType === 'team'
      ? sql`EXISTS (SELECT 1 FROM ${hackathonTeams} WHERE ${hackathonTeams.id} = ${input.targetId} AND ${hackathonTeams.eventId} = ${events.id})`
      : sql`EXISTS (SELECT 1 FROM ${hackathonSubmissions} WHERE ${hackathonSubmissions.id} = ${input.targetId} AND ${hackathonSubmissions.eventId} = ${events.id} AND ${hackathonSubmissions.status} = 'submitted')`
  }`;

/**
 * Where a report's target stands (B-SAFE-01): an entry the team submitted, or a team, of a
 * published hackathon, whether the reporter is in that team, and whether they reported it already.
 * `null` when there is no such target to report.
 */
export const readReportTarget = async (
  db: Db,
  input: Target,
): Promise<ReportTargetStanding | null> => {
  const [row] = await db
    .select({
      isReporterInTeam: sql<number>`EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${teamOf(input)} AND ${hackathonTeamMembers.userId} = ${input.reporterId})`,
      hasReported: sql<number>`EXISTS (SELECT 1 FROM ${hackathonReports} WHERE ${hackathonReports.targetType} = ${input.targetType} AND ${hackathonReports.targetId} = ${input.targetId} AND ${hackathonReports.reporterId} = ${input.reporterId})`,
    })
    .from(events)
    .where(and(eq(events.id, input.eventId), reportable(input)));
  return row
    ? {
        isReporterInTeam: Boolean(row.isReporterInTeam),
        hasReported: Boolean(row.hasReported),
      }
    : null;
};

/**
 * File a member's report about an entry or a team (B-SAFE-01), in one batch. The insert selects
 * from the hackathon, so it writes only for a target the hackathon still shows and a reporter who
 * is not in the team reported, and it takes the hackathon's market for the review queue. A second
 * report of the same target by the same member writes nothing and answers `already_reported`, read
 * back in the same batch.
 */
export const reportHackathonTarget = async (
  db: Db,
  input: Target & {
    readonly id: string;
    readonly reason: HackathonReportReason;
  },
): Promise<HackathonReportOutcome> => {
  const [written, existing] = await batch(db, [
    db
      .insert(hackathonReports)
      .select(
        db
          .select({
            id: sql<string>`${input.id}`.as('id'),
            eventId: events.id,
            marketCode: events.marketCode,
            targetType: sql<HackathonReportTarget>`${input.targetType}`.as(
              'target_type',
            ),
            targetId: sql<string>`${input.targetId}`.as('target_id'),
            reporterId: sql<string>`${input.reporterId}`.as('reporter_id'),
            reason: sql<HackathonReportReason>`${input.reason}`.as('reason'),
            status: sql<'open'>`'open'`.as('status'),
            reviewedBy: sql<null>`null`.as('reviewed_by'),
            reviewedAt: sql<null>`null`.as('reviewed_at'),
            decisionReason: sql<null>`null`.as('decision_reason'),
            evidence: sql<null>`null`.as('evidence'),
            createdAt: sql<number>`unixepoch()`.as('created_at'),
          })
          .from(events)
          .where(
            and(
              eq(events.id, input.eventId),
              reportable(input),
              sql`NOT EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${teamOf(input)} AND ${hackathonTeamMembers.userId} = ${input.reporterId})`,
            ),
          ),
      )
      .onConflictDoNothing({
        target: [
          hackathonReports.targetType,
          hackathonReports.targetId,
          hackathonReports.reporterId,
        ],
      }),
    db
      .select({ id: hackathonReports.id })
      .from(hackathonReports)
      .where(
        and(
          eq(hackathonReports.targetType, input.targetType),
          eq(hackathonReports.targetId, input.targetId),
          eq(hackathonReports.reporterId, input.reporterId),
        ),
      )
      .limit(1),
  ]);
  if (((written as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0)
    return 'reported';
  return (existing as { id: string }[]).length > 0
    ? 'already_reported'
    : 'refused';
};

const monthsBefore = (date: Date, months: number): Date => {
  const moment = new Date(date.getTime());
  moment.setUTCMonth(moment.getUTCMonth() - months);
  return moment;
};

/**
 * Delete up to `limit` hackathon reports decided more than {@link HACKATHON_REPORT_KEPT_MONTHS}
 * months ago (B-SAFE-01), read only through the partial index on `reviewed_at`: the narrow, indexed
 * daily sweep AGENTS.md §11.5 allows for retention. An open report has no decision and is never
 * among them. Returns how many went.
 */
export const deleteExpiredHackathonReports = async (
  db: Db,
  input: { readonly now: Date; readonly limit: number },
): Promise<number> => {
  const deleted = await db
    .delete(hackathonReports)
    .where(
      inArray(
        hackathonReports.id,
        db
          .select({ id: hackathonReports.id })
          .from(hackathonReports)
          .where(
            and(
              isNotNull(hackathonReports.reviewedAt),
              lt(
                hackathonReports.reviewedAt,
                monthsBefore(input.now, HACKATHON_REPORT_KEPT_MONTHS),
              ),
            ),
          )
          .limit(input.limit),
      ),
    )
    .returning({ id: hackathonReports.id });
  return deleted.length;
};
