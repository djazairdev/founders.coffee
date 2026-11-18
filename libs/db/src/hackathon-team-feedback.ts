import { and, eq, notExists } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  hackathonJudges,
  hackathonRecusals,
  hackathonResults,
  hackathonScores,
} from './schema.js';

/**
 * A team's entry as its results froze it, with the scores it was given (B-JDG-12): those of judges
 * who accepted, the same ones the ranking counted, and none from a judge who recused from it.
 * `null` when the team has no result, which is also the answer before the results are published.
 */
export const readTeamFeedback = async (
  db: Db,
  input: { readonly eventId: string; readonly teamId: string },
) => {
  const [result] = await db
    .select({
      submissionId: hackathonResults.submissionId,
      title: hackathonResults.title,
      criteria: hackathonResults.criteria,
    })
    .from(hackathonResults)
    .where(
      and(
        eq(hackathonResults.eventId, input.eventId),
        eq(hackathonResults.teamId, input.teamId),
      ),
    )
    .limit(1);
  if (!result) return null;
  const scores = await db
    .select({
      judgeId: hackathonScores.judgeId,
      criterionId: hackathonScores.criterionId,
      value: hackathonScores.value,
      comment: hackathonScores.comment,
    })
    .from(hackathonScores)
    .innerJoin(
      hackathonJudges,
      and(
        eq(hackathonJudges.id, hackathonScores.judgeId),
        eq(hackathonJudges.status, 'accepted'),
      ),
    )
    .where(
      and(
        eq(hackathonScores.submissionId, result.submissionId),
        notExists(
          db
            .select({ judgeId: hackathonRecusals.judgeId })
            .from(hackathonRecusals)
            .where(
              and(
                eq(hackathonRecusals.judgeId, hackathonScores.judgeId),
                eq(
                  hackathonRecusals.submissionId,
                  hackathonScores.submissionId,
                ),
              ),
            ),
        ),
      ),
    );
  return { title: result.title, criteria: result.criteria, scores };
};
