import { and, asc, eq, sql, type SQL } from 'drizzle-orm';

import type { Db } from './db.js';
import { batch } from './atomic.js';
import {
  issueCertificatesStatement,
  revokeDisqualifiedCertificatesStatement,
  type NewCertificate,
} from './hackathon-certificates.js';
import { issuePrizeAwardsStatement } from './hackathon-prize-awards.js';
import { lastSubmittedVersion } from './hackathon-submitted-version.js';
import { bound } from './insert-select.js';
import { auditStatement } from './operations-audit.js';
import {
  events,
  hackathonJudges,
  hackathonPullRequests,
  hackathonRecusals,
  hackathonResults,
  hackathons,
  hackathonScores,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeams,
  hackathonTracks,
  operationsAudit,
  type FrozenCriterionResult,
  type HackathonResult,
} from './schema.js';

export type ResultsEntry = {
  readonly submissionId: string;
  readonly version: number;
  readonly teamId: string;
  readonly teamName: string;
  readonly title: string;
  readonly trackId: string | null;
  readonly trackTitle: string | null;
};

export type FrozenResult = ResultsEntry & {
  readonly total: number | null;
  readonly rank: number | null;
  readonly trackRank: number | null;
  readonly tieNote: HackathonResult['tieNote'];
  readonly criteria: readonly FrozenCriterionResult[];
};

/** Each submitted entry of a hackathon as it was last submitted, in the order teams submitted. */
export const listResultsEntries = (
  db: Db,
  eventId: string,
): Promise<readonly ResultsEntry[]> =>
  db
    .select({
      submissionId: hackathonSubmissions.id,
      version: hackathonSubmissionVersions.version,
      teamId: hackathonSubmissions.teamId,
      teamName: hackathonTeams.name,
      title: hackathonSubmissionVersions.title,
      trackId: hackathonSubmissionVersions.trackId,
      trackTitle: hackathonTracks.title,
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
    .where(
      and(
        eq(hackathonSubmissions.eventId, eventId),
        eq(hackathonSubmissions.status, 'submitted'),
      ),
    )
    .orderBy(hackathonSubmissions.submittedAt, hackathonSubmissions.id);

/**
 * What the ranking reads for a hackathon (B-JDG-09): its accepted judges, their scores and their
 * recusals. A judge who was removed or never accepted counts for nothing.
 */
export const readJudgingRecord = async (db: Db, eventId: string) => {
  const isAccepted = and(
    eq(hackathonJudges.eventId, eventId),
    eq(hackathonJudges.status, 'accepted'),
  );
  const [judges, scores, recusals] = await Promise.all([
    db
      .select({ id: hackathonJudges.id, userId: hackathonJudges.userId })
      .from(hackathonJudges)
      .where(isAccepted),
    db
      .select({
        entryId: hackathonScores.submissionId,
        judgeId: hackathonScores.judgeId,
        criterionId: hackathonScores.criterionId,
        score: hackathonScores.value,
      })
      .from(hackathonScores)
      .innerJoin(
        hackathonJudges,
        eq(hackathonJudges.id, hackathonScores.judgeId),
      )
      .where(isAccepted),
    db
      .select({
        entryId: hackathonRecusals.submissionId,
        judgeId: hackathonRecusals.judgeId,
      })
      .from(hackathonRecusals)
      .where(eq(hackathonRecusals.eventId, eventId)),
  ]);
  return {
    judges,
    judgeIds: judges.map((judge) => judge.id),
    scores,
    recusals,
  };
};

/**
 * Publish a hackathon's results (B-JDG-09), in one batch: its results are marked published, the
 * audit entry follows that write's `changes()`, and each frozen row, the prize awards (B-PRZ-01) and
 * the certificates (B-CRT-01) follow the audit entry. An entry disqualified since it was read is marked as it freezes, and what
 * its team earned revoked (B-SAFE-03). Nothing lands when judging has not ended or another organiser
 * published first. Returns whether this call published them.
 */
export const publishResults = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly actorUserId: string;
    readonly auditId: string;
    readonly publishedAt: Date;
    readonly results: readonly FrozenResult[];
    readonly certificates: readonly NewCertificate[];
    readonly awards: readonly {
      readonly prizeId: string;
      readonly submissionId: string;
    }[];
    readonly metadata: Record<string, unknown>;
  },
): Promise<boolean> => {
  const isThisPublication = sql`EXISTS (SELECT 1 FROM ${operationsAudit} WHERE ${operationsAudit.id} = ${input.auditId})`;
  const [published] = await batch(db, [
    db
      .update(hackathons)
      .set({ resultsPublishedAt: input.publishedAt, updatedAt: new Date() })
      .where(
        and(
          eq(hackathons.eventId, input.eventId),
          sql`${hackathons.resultsPublishedAt} IS NULL`,
          sql`${hackathons.judgingEndsAt} <= ${Math.floor(input.publishedAt.getTime() / 1000)}`,
        ),
      )
      .returning({ eventId: hackathons.eventId }),
    auditStatement(
      db,
      {
        id: input.auditId,
        actorUserId: input.actorUserId,
        accessSubject: null,
        action: 'results_published',
        targetType: 'hackathon',
        targetId: input.eventId,
        reasonCode: null,
        metadata: input.metadata,
      },
      events,
      events.marketCode,
      and(eq(events.id, input.eventId), sql`changes() > 0`),
    ),
    ...input.results.map((result) =>
      db.insert(hackathonResults).select(
        db
          .select({
            submissionId: bound(result.submissionId, 'submission_id'),
            eventId: bound(input.eventId, 'event_id'),
            version: bound(result.version, 'version'),
            teamId: bound(result.teamId, 'team_id'),
            teamName: bound(result.teamName, 'team_name'),
            title: bound(result.title, 'title'),
            trackId: bound(result.trackId, 'track_id'),
            trackTitle: bound(result.trackTitle, 'track_title'),
            total: bound(result.total, 'total'),
            rank: bound(result.rank, 'rank'),
            trackRank: bound(result.trackRank, 'track_rank'),
            tieNote: bound(result.tieNote, 'tie_note'),
            disqualifiedAt:
              sql<Date | null>`(SELECT CASE ${hackathonSubmissions.status} WHEN 'disqualified' THEN unixepoch() END FROM ${hackathonSubmissions} WHERE ${hackathonSubmissions.id} = ${result.submissionId})`.as(
                'disqualified_at',
              ),
            criteria: bound(JSON.stringify(result.criteria), 'criteria'),
            createdAt: sql`unixepoch()`.as('created_at'),
          })
          .from(hackathons)
          .where(and(eq(hackathons.eventId, input.eventId), isThisPublication)),
      ),
    ),
    issuePrizeAwardsStatement(db, {
      awards: input.awards,
      awardedAt: input.publishedAt,
      isIssued: isThisPublication,
    }),
    issueCertificatesStatement(db, {
      eventId: input.eventId,
      certificates: input.certificates,
      issuedAt: input.publishedAt,
      isIssued: isThisPublication,
    }),
    revokeDisqualifiedCertificatesStatement(db, {
      eventId: input.eventId,
      revokedAt: input.publishedAt,
      isRevoked: isThisPublication,
    }),
  ]);
  return (published as readonly unknown[]).length > 0;
};

/** A hackathon's frozen results, ranked entries first, best first. */
export const listHackathonResults = (
  db: Db,
  eventId: string,
): Promise<readonly HackathonResult[]> =>
  db
    .select()
    .from(hackathonResults)
    .where(eq(hackathonResults.eventId, eventId))
    .orderBy(
      sql`${hackathonResults.rank} IS NULL`,
      asc(hackathonResults.rank),
      asc(hackathonResults.submissionId),
    );

/**
 * A hackathon's frozen results as its page shows them (B-JDG-10), with the pull requests of the
 * version each entry was judged on: gone only if the entry itself was deleted. `eventId` may be a
 * subquery, for the page's batch.
 */
export const publicHackathonResultsQuery = (db: Db, eventId: string | SQL) =>
  db
    .select({
      submissionId: hackathonResults.submissionId,
      teamName: hackathonResults.teamName,
      title: hackathonResults.title,
      trackId: hackathonResults.trackId,
      trackTitle: hackathonResults.trackTitle,
      total: hackathonResults.total,
      rank: hackathonResults.rank,
      trackRank: hackathonResults.trackRank,
      tieNote: hackathonResults.tieNote,
      disqualifiedAt: hackathonResults.disqualifiedAt,
      criteria: hackathonResults.criteria,
      pullRequestUrls: hackathonSubmissionVersions.pullRequestUrls,
    })
    .from(hackathonResults)
    .leftJoin(
      hackathonSubmissionVersions,
      and(
        eq(
          hackathonSubmissionVersions.submissionId,
          hackathonResults.submissionId,
        ),
        eq(hackathonSubmissionVersions.version, hackathonResults.version),
      ),
    )
    .where(eq(hackathonResults.eventId, eventId))
    .orderBy(
      sql`${hackathonResults.rank} IS NULL`,
      asc(hackathonResults.rank),
      asc(hackathonResults.submissionId),
    );

/** What organisers recorded about the pull requests of a hackathon's frozen results (B-JDG-10). */
export const publicResultPullRequestsQuery = (db: Db, eventId: string | SQL) =>
  db
    .select({
      submissionId: hackathonPullRequests.submissionId,
      url: hackathonPullRequests.url,
      status: hackathonPullRequests.status,
    })
    .from(hackathonPullRequests)
    .innerJoin(
      hackathonResults,
      eq(hackathonResults.submissionId, hackathonPullRequests.submissionId),
    )
    .where(eq(hackathonResults.eventId, eventId));
