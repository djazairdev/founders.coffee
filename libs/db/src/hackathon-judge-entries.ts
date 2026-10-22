import { and, eq, isNull, sql } from 'drizzle-orm';

import type { HackathonJudgeStatus } from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { lastSubmittedVersion } from './hackathon-submitted-version.js';
import { auditStatement } from './operations-audit.js';
import {
  events,
  hackathonJudges,
  hackathonRecusals,
  hackathons,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeams,
  hackathonTracks,
} from './schema.js';

export type JudgePlace = {
  readonly judgeId: string;
  readonly status: HackathonJudgeStatus;
};

export type JudgeEntry = {
  readonly submissionId: string;
  readonly teamName: string;
  readonly trackId: string;
  readonly trackTitle: string | null;
  readonly version: number;
  readonly title: string;
  readonly description: string;
  readonly repositoryUrl: string;
  readonly demoVideoUrl: string | null;
  readonly pullRequestUrls: readonly string[];
  readonly aiTools: readonly string[];
  readonly aiStatement: string;
  readonly submittedAt: Date;
};

/** The judge's place the member holds in a hackathon, with its status, or `null` for none. */
export const readJudgePlace = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<JudgePlace | null> => {
  const [row] = await db
    .select({ judgeId: hackathonJudges.id, status: hackathonJudges.status })
    .from(hackathonJudges)
    .where(
      and(
        eq(hackathonJudges.eventId, input.eventId),
        eq(hackathonJudges.userId, input.userId),
      ),
    );
  return row ?? null;
};

/** The status of an entry of the hackathon, or `null` when it is not one of its entries. */
export const readEntryStatus = async (
  db: Db,
  input: { readonly eventId: string; readonly submissionId: string },
) => {
  const [row] = await db
    .select({ status: hackathonSubmissions.status })
    .from(hackathonSubmissions)
    .where(
      and(
        eq(hackathonSubmissions.id, input.submissionId),
        eq(hackathonSubmissions.eventId, input.eventId),
      ),
    );
  return row?.status ?? null;
};

/** Whether the judge has recused themselves from the entry. */
export const hasRecused = async (
  db: Db,
  input: { readonly judgeId: string; readonly submissionId: string },
): Promise<boolean> => {
  const [row] = await db
    .select({ judgeId: hackathonRecusals.judgeId })
    .from(hackathonRecusals)
    .where(
      and(
        eq(hackathonRecusals.judgeId, input.judgeId),
        eq(hackathonRecusals.submissionId, input.submissionId),
      ),
    );
  return row !== undefined;
};

/**
 * Every entry a judge reads (B-JDG-04): each submitted entry of the hackathon, as it was last
 * submitted, with its team and track, leaving out the ones the judge recused from. Every judge sees
 * every entry in Stage B. The order is the one teams submitted in.
 */
export const listJudgeEntries = async (
  db: Db,
  input: { readonly eventId: string; readonly judgeId: string },
): Promise<readonly JudgeEntry[]> => {
  const rows = await db
    .select({
      submissionId: hackathonSubmissions.id,
      teamName: hackathonTeams.name,
      trackId: hackathonSubmissionVersions.trackId,
      trackTitle: hackathonTracks.title,
      version: hackathonSubmissionVersions.version,
      title: hackathonSubmissionVersions.title,
      description: hackathonSubmissionVersions.description,
      repositoryUrl: hackathonSubmissionVersions.repositoryUrl,
      demoVideoUrl: hackathonSubmissionVersions.demoVideoUrl,
      pullRequestUrls: hackathonSubmissionVersions.pullRequestUrls,
      aiTools: hackathonSubmissionVersions.aiTools,
      aiStatement: hackathonSubmissionVersions.aiStatement,
      submittedAt: hackathonSubmissionVersions.submittedAt,
    })
    .from(hackathonSubmissions)
    .innerJoin(
      hackathonTeams,
      eq(hackathonTeams.id, hackathonSubmissions.teamId),
    )
    .innerJoin(
      hackathonSubmissionVersions,
      and(
        eq(hackathonSubmissionVersions.submissionId, hackathonSubmissions.id),
        lastSubmittedVersion,
      ),
    )
    .leftJoin(
      hackathonTracks,
      eq(hackathonTracks.id, hackathonSubmissionVersions.trackId),
    )
    .leftJoin(
      hackathonRecusals,
      and(
        eq(hackathonRecusals.submissionId, hackathonSubmissions.id),
        eq(hackathonRecusals.judgeId, input.judgeId),
      ),
    )
    .where(
      and(
        eq(hackathonSubmissions.eventId, input.eventId),
        eq(hackathonSubmissions.status, 'submitted'),
        isNull(hackathonRecusals.judgeId),
      ),
    )
    .orderBy(hackathonSubmissions.submittedAt, hackathonSubmissions.id);
  return rows;
};

/**
 * Recuse a judge from an entry (B-JDG-04), with its audit entry, in one batch. The recusal lands
 * only while the hackathon is published and judging, before its results, for a judge who accepted
 * their place and an entry that is submitted; it can never be undone, so a second one changes
 * nothing. The audit entry is written only when the recusal was (`changes()`). Returns whether it
 * landed.
 */
export const recuseFromEntry = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly judgeId: string;
    readonly submissionId: string;
    readonly reason: string;
    readonly actorUserId: string;
    readonly auditId: string;
  },
): Promise<boolean> => {
  const results = await batch(db, [
    db
      .insert(hackathonRecusals)
      .select(
        db
          .select({
            judgeId: hackathonJudges.id,
            submissionId: hackathonSubmissions.id,
            eventId: hackathonJudges.eventId,
            reason: sql<string>`${input.reason}`.as('reason'),
            createdAt: sql<number>`unixepoch()`.as('created_at'),
          })
          .from(hackathonJudges)
          .innerJoin(
            hackathonSubmissions,
            eq(hackathonSubmissions.eventId, hackathonJudges.eventId),
          )
          .innerJoin(
            hackathons,
            eq(hackathons.eventId, hackathonJudges.eventId),
          )
          .innerJoin(events, eq(events.id, hackathonJudges.eventId))
          .where(
            and(
              eq(hackathonJudges.id, input.judgeId),
              eq(hackathonJudges.eventId, input.eventId),
              eq(hackathonJudges.status, 'accepted'),
              eq(hackathonSubmissions.id, input.submissionId),
              eq(hackathonSubmissions.status, 'submitted'),
              eq(events.status, 'published'),
              isNull(hackathons.resultsPublishedAt),
              sql`${hackathons.submissionDeadlineAt} <= unixepoch()`,
              sql`${hackathons.judgingEndsAt} > unixepoch()`,
            ),
          ),
      )
      .onConflictDoNothing()
      .returning({ judgeId: hackathonRecusals.judgeId }),
    auditStatement(
      db,
      {
        id: input.auditId,
        actorUserId: input.actorUserId,
        accessSubject: null,
        action: 'recused',
        targetType: 'submission',
        targetId: input.submissionId,
        reasonCode: null,
        metadata: { judgeId: input.judgeId },
      },
      events,
      events.marketCode,
      and(eq(events.id, input.eventId), sql`changes() = 1`),
    ),
  ]);
  return (results[0] as readonly { judgeId: string }[]).length === 1;
};
