import { and, asc, eq, inArray, min, sql, type SQL } from 'drizzle-orm';

import type {
  HackathonReportReason,
  HackathonReportTarget,
  HackathonSubmissionStatus,
} from '@founders-coffee/core';

import type { Db } from './db.js';
import { lastSubmittedVersion } from './hackathon-submitted-version.js';
import {
  events,
  hackathonReports,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeams,
  markets,
} from './schema.js';

const QUEUE_PAGE_SIZE = 20;

export type ReportedTarget = {
  readonly targetType: HackathonReportTarget;
  readonly targetId: string;
};

export type ReportTargetSummary = ReportedTarget & {
  readonly eventId: string;
  readonly eventTitle: string;
  readonly marketCode: string;
  readonly timeZone: string;
  readonly teamId: string | null;
  readonly teamName: string | null;
  readonly reports: number;
  readonly reasons: readonly HackathonReportReason[];
  readonly firstReportedAt: Date;
};

export type ReportedEntry = {
  readonly teamId: string;
  readonly submissionId: string;
  readonly status: HackathonSubmissionStatus;
  readonly title: string;
  readonly repositoryUrl: string;
};

const teamIdOf = (targetType: SQL | string, targetId: SQL | string): SQL =>
  sql`CASE ${targetType} WHEN 'team' THEN (SELECT ${hackathonTeams.id} FROM ${hackathonTeams} WHERE ${hackathonTeams.id} = ${targetId}) ELSE (SELECT ${hackathonSubmissions.teamId} FROM ${hackathonSubmissions} WHERE ${hackathonSubmissions.id} = ${targetId}) END`;

const reportsOn = (target: ReportedTarget) =>
  and(
    eq(hackathonReports.targetType, target.targetType),
    eq(hackathonReports.targetId, target.targetId),
  );

/**
 * One page of the reported entries and teams still waiting for a decision (B-SAFE-02), one row per
 * target with how many open reports it has and their reasons, the longest waiting first. The team is
 * `null` once it has disbanded.
 */
export const listOpenReportTargets = async (
  db: Db,
  page: number,
): Promise<{
  readonly items: readonly ReportTargetSummary[];
  readonly hasMore: boolean;
}> => {
  const teamId = teamIdOf(
    sql`${hackathonReports.targetType}`,
    sql`${hackathonReports.targetId}`,
  );
  const rows = await db
    .select({
      targetType: hackathonReports.targetType,
      targetId: hackathonReports.targetId,
      eventId: hackathonReports.eventId,
      eventTitle: events.title,
      marketCode: hackathonReports.marketCode,
      timeZone: markets.timezone,
      teamId: sql<string | null>`${teamId}`,
      teamName: sql<
        string | null
      >`(SELECT ${hackathonTeams.name} FROM ${hackathonTeams} WHERE ${hackathonTeams.id} = ${teamId})`,
      reports: sql<number>`count(*)`,
      reasons: sql<string>`group_concat(DISTINCT ${hackathonReports.reason})`,
      firstReportedAt: min(hackathonReports.createdAt),
    })
    .from(hackathonReports)
    .innerJoin(events, eq(events.id, hackathonReports.eventId))
    .innerJoin(markets, eq(markets.code, hackathonReports.marketCode))
    .where(eq(hackathonReports.status, 'open'))
    .groupBy(hackathonReports.targetType, hackathonReports.targetId)
    .orderBy(asc(min(hackathonReports.createdAt)), hackathonReports.targetId)
    .limit(QUEUE_PAGE_SIZE + 1)
    .offset(page * QUEUE_PAGE_SIZE);
  return {
    items: rows.slice(0, QUEUE_PAGE_SIZE).map((row) => ({
      ...row,
      reasons: row.reasons.split(',') as HackathonReportReason[],
      firstReportedAt: row.firstReportedAt ?? new Date(0),
    })),
    hasMore: rows.length > QUEUE_PAGE_SIZE,
  };
};

/** The entries of the given teams as each was last submitted, for the queue to show what was reported. */
export const listReportedEntries = async (
  db: Db,
  teamIds: readonly string[],
): Promise<readonly ReportedEntry[]> =>
  teamIds.length === 0
    ? []
    : db
        .select({
          teamId: hackathonSubmissions.teamId,
          submissionId: hackathonSubmissions.id,
          status: hackathonSubmissions.status,
          title: hackathonSubmissionVersions.title,
          repositoryUrl: hackathonSubmissionVersions.repositoryUrl,
        })
        .from(hackathonSubmissions)
        .innerJoin(
          hackathonSubmissionVersions,
          and(
            eq(
              hackathonSubmissionVersions.submissionId,
              hackathonSubmissions.id,
            ),
            lastSubmittedVersion,
          ),
        )
        .where(inArray(hackathonSubmissions.teamId, [...teamIds]));

/**
 * Where a reported target stands for a decision (B-SAFE-02): its hackathon, the team it belongs to
 * (`null` once disbanded) and how many of its reports are still open. `null` when it was never
 * reported.
 */
export const readReportReviewTarget = async (
  db: Db,
  target: ReportedTarget,
): Promise<{
  readonly eventId: string;
  readonly teamId: string | null;
  readonly openReports: number;
} | null> => {
  const [row] = await db
    .select({
      eventId: hackathonReports.eventId,
      teamId: sql<
        string | null
      >`${teamIdOf(target.targetType, target.targetId)}`,
      openReports: sql<number>`sum(${hackathonReports.status} = 'open')`,
    })
    .from(hackathonReports)
    .where(reportsOn(target))
    .groupBy(hackathonReports.eventId);
  return row ? { ...row, openReports: row.openReports ?? 0 } : null;
};
