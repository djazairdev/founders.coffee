import { and, eq, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  hackathonCriteria,
  hackathonJudges,
  hackathonRecusals,
  hackathonRegistrations,
  hackathonScores,
  hackathonSubmissions,
  hackathonTeams,
} from './schema.js';

export type HackathonDashboardCounts = {
  readonly registered: number;
  readonly waitlisted: number;
  readonly teams: number;
  readonly submissions: number;
  readonly judges: number;
  readonly reviewsDone: number;
  readonly reviewsExpected: number;
};

const total = sql<number>`count(*)`;

/**
 * What a hackathon's organisers see at a glance (B-OPS-01), counted in one trip to D1: who is
 * registered and waitlisted, its teams, the entries submitted, the judges who accepted, and how far
 * judging has come. A review is one accepted judge's scores for one submitted entry; it is done
 * once the judge has scored every criterion of the rubric, and expected for every pair of judge and
 * entry the judge has not recused from.
 */
export const readHackathonDashboardCounts = async (
  db: Db,
  eventId: string,
): Promise<HackathonDashboardCounts> => {
  const acceptedJudge = sql`${hackathonJudges.status} = 'accepted'`;
  const [registrations, teams, submissions, judges, done, recused] =
    await db.batch([
      db
        .select({ status: hackathonRegistrations.status, total })
        .from(hackathonRegistrations)
        .where(eq(hackathonRegistrations.eventId, eventId))
        .groupBy(hackathonRegistrations.status),
      db
        .select({ total })
        .from(hackathonTeams)
        .where(eq(hackathonTeams.eventId, eventId)),
      db
        .select({ total })
        .from(hackathonSubmissions)
        .where(
          and(
            eq(hackathonSubmissions.eventId, eventId),
            eq(hackathonSubmissions.status, 'submitted'),
          ),
        ),
      db
        .select({ total })
        .from(hackathonJudges)
        .where(and(eq(hackathonJudges.eventId, eventId), acceptedJudge)),
      db.select({ total }).from(
        db
          .select({ judgeId: hackathonScores.judgeId })
          .from(hackathonScores)
          .innerJoin(
            hackathonJudges,
            eq(hackathonJudges.id, hackathonScores.judgeId),
          )
          .innerJoin(
            hackathonSubmissions,
            eq(hackathonSubmissions.id, hackathonScores.submissionId),
          )
          .where(
            and(
              eq(hackathonScores.eventId, eventId),
              acceptedJudge,
              eq(hackathonSubmissions.status, 'submitted'),
              sql`NOT EXISTS (SELECT 1 FROM ${hackathonRecusals} WHERE ${hackathonRecusals.judgeId} = ${hackathonScores.judgeId} AND ${hackathonRecusals.submissionId} = ${hackathonScores.submissionId})`,
            ),
          )
          .groupBy(hackathonScores.judgeId, hackathonScores.submissionId)
          .having(
            sql`count(*) >= (SELECT count(*) FROM ${hackathonCriteria} WHERE ${hackathonCriteria.eventId} = ${eventId})`,
          )
          .as('reviews_done'),
      ),
      db
        .select({ total })
        .from(hackathonRecusals)
        .innerJoin(
          hackathonJudges,
          eq(hackathonJudges.id, hackathonRecusals.judgeId),
        )
        .innerJoin(
          hackathonSubmissions,
          eq(hackathonSubmissions.id, hackathonRecusals.submissionId),
        )
        .where(
          and(
            eq(hackathonRecusals.eventId, eventId),
            acceptedJudge,
            eq(hackathonSubmissions.status, 'submitted'),
          ),
        ),
    ]);
  const countOf = (rows: readonly { readonly total: number }[]) =>
    Number(rows[0]?.total ?? 0);
  const byStatus = (status: string) =>
    Number(registrations.find((row) => row.status === status)?.total ?? 0);
  const submitted = countOf(submissions);
  const judgeCount = countOf(judges);
  return {
    registered: byStatus('registered'),
    waitlisted: byStatus('waitlisted'),
    teams: countOf(teams),
    submissions: submitted,
    judges: judgeCount,
    reviewsDone: countOf(done),
    reviewsExpected: judgeCount * submitted - countOf(recused),
  };
};
