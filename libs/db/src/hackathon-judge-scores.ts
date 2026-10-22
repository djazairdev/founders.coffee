import { and, eq, isNull, sql } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import {
  events,
  hackathonCriteria,
  hackathonJudges,
  hackathonRecusals,
  hackathons,
  hackathonScores,
  hackathonSubmissions,
} from './schema.js';

export type JudgeScoreWrite = {
  readonly criterionId: string;
  readonly value: number;
  readonly comment: string | null;
};

/** A hackathon's criteria with their scales, for checking scores against them. */
export const listCriterionScales = (db: Db, eventId: string) =>
  db
    .select({ id: hackathonCriteria.id, scale: hackathonCriteria.scale })
    .from(hackathonCriteria)
    .where(eq(hackathonCriteria.eventId, eventId));

/**
 * Save a judge's scores for one entry (B-JDG-05), replacing the ones they saved before, in one
 * batch. Each statement writes only while the hackathon is published and judging, before its
 * results, for a judge who accepted their place and did not recuse from the entry, an entry that
 * is submitted, a criterion of the same hackathon and a value within its scale. Returns how many
 * scores were written: all of them, or none when the hackathon moved on in between.
 */
export const saveJudgeScores = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly judgeId: string;
    readonly submissionId: string;
    readonly scores: readonly JudgeScoreWrite[];
  },
): Promise<number> => {
  const [first, ...rest] = input.scores.map((score) =>
    db
      .insert(hackathonScores)
      .select(
        db
          .select({
            submissionId: hackathonSubmissions.id,
            judgeId: hackathonJudges.id,
            criterionId: hackathonCriteria.id,
            eventId: hackathonJudges.eventId,
            value: sql<number>`${score.value}`.as('value'),
            comment: sql<string | null>`${score.comment}`.as('comment'),
            createdAt: sql<number>`unixepoch()`.as('created_at'),
            updatedAt: sql<number>`unixepoch()`.as('updated_at'),
          })
          .from(hackathonJudges)
          .innerJoin(
            hackathonSubmissions,
            eq(hackathonSubmissions.eventId, hackathonJudges.eventId),
          )
          .innerJoin(
            hackathonCriteria,
            eq(hackathonCriteria.eventId, hackathonJudges.eventId),
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
              eq(hackathonCriteria.id, score.criterionId),
              sql`${score.value} <= ${hackathonCriteria.scale}`,
              eq(events.status, 'published'),
              isNull(hackathons.resultsPublishedAt),
              sql`${hackathons.submissionDeadlineAt} <= unixepoch()`,
              sql`${hackathons.judgingEndsAt} > unixepoch()`,
              sql`NOT EXISTS (SELECT 1 FROM ${hackathonRecusals} WHERE ${hackathonRecusals.judgeId} = ${input.judgeId} AND ${hackathonRecusals.submissionId} = ${input.submissionId})`,
            ),
          ),
      )
      .onConflictDoUpdate({
        target: [
          hackathonScores.submissionId,
          hackathonScores.judgeId,
          hackathonScores.criterionId,
        ],
        set: {
          value: score.value,
          comment: score.comment,
          updatedAt: new Date(),
        },
      })
      .returning({ criterionId: hackathonScores.criterionId }),
  );
  if (!first) return 0;
  const results = await batch(db, [first, ...rest]);
  return results.reduce(
    (total, rows) => total + (rows as readonly unknown[]).length,
    0,
  );
};

/** A judge's saved scores for one entry, by criterion. */
export const listJudgeScores = (
  db: Db,
  input: { readonly judgeId: string; readonly submissionId: string },
) =>
  db
    .select({
      criterionId: hackathonScores.criterionId,
      value: hackathonScores.value,
      comment: hackathonScores.comment,
    })
    .from(hackathonScores)
    .where(
      and(
        eq(hackathonScores.judgeId, input.judgeId),
        eq(hackathonScores.submissionId, input.submissionId),
      ),
    );
