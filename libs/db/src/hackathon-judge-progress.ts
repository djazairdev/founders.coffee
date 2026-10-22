import { and, eq, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import { lastSubmittedVersion } from './hackathon-submitted-version.js';
import {
  hackathonRecusals,
  hackathonScores,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeams,
  hackathonTracks,
} from './schema.js';

export type JudgeProgressRow = {
  readonly submissionId: string;
  readonly teamName: string;
  readonly title: string;
  readonly trackTitle: string | null;
  readonly isRecused: boolean;
  readonly scoredCount: number;
};

/**
 * Every submitted entry of a hackathon as a judge's list shows it (B-JDG-06), recused ones
 * included: its team, its title and track as last submitted, whether the judge recused from it and
 * how many criteria they scored it on. The order is the one teams submitted in.
 */
export const listJudgeProgress = async (
  db: Db,
  input: { readonly eventId: string; readonly judgeId: string },
): Promise<readonly JudgeProgressRow[]> => {
  const rows = await db
    .select({
      submissionId: hackathonSubmissions.id,
      teamName: hackathonTeams.name,
      title: hackathonSubmissionVersions.title,
      trackTitle: hackathonTracks.title,
      recusedBy: hackathonRecusals.judgeId,
      scoredCount: sql<number>`(SELECT count(*) FROM ${hackathonScores} WHERE ${hackathonScores.submissionId} = ${hackathonSubmissions.id} AND ${hackathonScores.judgeId} = ${input.judgeId})`,
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
      ),
    )
    .orderBy(hackathonSubmissions.submittedAt, hackathonSubmissions.id);
  return rows.map(({ recusedBy, ...row }) => ({
    ...row,
    isRecused: recusedBy !== null,
  }));
};
