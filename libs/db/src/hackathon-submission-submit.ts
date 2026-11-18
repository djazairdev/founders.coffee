import { and, eq, ne, sql } from 'drizzle-orm';

import type { HackathonSubmissionStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import type { SubmissionDraftFields } from './hackathon-submission-drafts.js';
import { bound } from './insert-select.js';
import {
  events,
  hackathons,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeamMembers,
} from './schema.js';

export type TeamSubmissionEntry = SubmissionDraftFields & {
  readonly id: string;
  readonly status: HackathonSubmissionStatus;
  readonly version: number;
};

/** The team's submission with everything a submit checks, or `null` before its first save. */
export const readTeamSubmissionEntry = async (
  db: Db,
  teamId: string,
): Promise<TeamSubmissionEntry | null> => {
  const [row] = await db
    .select({
      id: hackathonSubmissions.id,
      status: hackathonSubmissions.status,
      version: hackathonSubmissions.version,
      trackId: hackathonSubmissions.trackId,
      title: hackathonSubmissions.title,
      description: hackathonSubmissions.description,
      repositoryUrl: hackathonSubmissions.repositoryUrl,
      demoVideoUrl: hackathonSubmissions.demoVideoUrl,
      pullRequestUrls: hackathonSubmissions.pullRequestUrls,
      aiTools: hackathonSubmissions.aiTools,
      aiStatement: hackathonSubmissions.aiStatement,
    })
    .from(hackathonSubmissions)
    .where(eq(hackathonSubmissions.teamId, teamId));
  return row ?? null;
};

/**
 * Submit the team's entry (B-SUB-04) in one atomic batch, as of `now` on the server's clock: the
 * entry turns `submitted` at the version the captain saw, its version moves on, and a snapshot of
 * what was submitted is kept under that new version. The update holds only while the member
 * captains the team, the hackathon is published, kickoff has come and `now` is before the
 * submission deadline, to the second, and the entry is not disqualified; the snapshot follows only
 * an update that landed. Returns the new version, or `null` when nothing was written.
 */
export const submitTeamSubmission = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly teamId: string;
    readonly captainId: string;
    readonly version: number;
    readonly now: Date;
  },
): Promise<number | null> => {
  const at = Math.floor(input.now.getTime() / 1000);
  const submittedAt = new Date(at * 1000);
  const [updated] = await db.batch([
    db
      .update(hackathonSubmissions)
      .set({
        status: 'submitted',
        submittedAt,
        originalWorkAttestedAt: submittedAt,
        version: sql`${hackathonSubmissions.version} + 1`,
        updatedAt: submittedAt,
      })
      .where(
        and(
          eq(hackathonSubmissions.teamId, input.teamId),
          eq(hackathonSubmissions.eventId, input.eventId),
          eq(hackathonSubmissions.version, input.version),
          ne(hackathonSubmissions.status, 'disqualified'),
          sql`${hackathonSubmissions.trackId} IS NOT NULL AND ${hackathonSubmissions.repositoryUrl} IS NOT NULL AND ${hackathonSubmissions.aiStatement} IS NOT NULL`,
          sql`EXISTS (SELECT 1 FROM ${hackathonTeamMembers} JOIN ${hackathons} ON ${hackathons.eventId} = ${hackathonTeamMembers.eventId} JOIN ${events} ON ${events.id} = ${hackathonTeamMembers.eventId} WHERE ${hackathonTeamMembers.teamId} = ${input.teamId} AND ${hackathonTeamMembers.eventId} = ${input.eventId} AND ${hackathonTeamMembers.userId} = ${input.captainId} AND ${hackathonTeamMembers.isCaptain} = 1 AND ${events.status} = 'published' AND ${events.startsAt} <= ${at} AND ${hackathons.submissionDeadlineAt} > ${at})`,
        ),
      )
      .returning({ version: hackathonSubmissions.version }),
    db.insert(hackathonSubmissionVersions).select(
      db
        .select({
          submissionId: hackathonSubmissions.id,
          version: hackathonSubmissions.version,
          trackId: hackathonSubmissions.trackId,
          title: hackathonSubmissions.title,
          description: hackathonSubmissions.description,
          repositoryUrl: hackathonSubmissions.repositoryUrl,
          demoVideoUrl: hackathonSubmissions.demoVideoUrl,
          pullRequestUrls: hackathonSubmissions.pullRequestUrls,
          aiTools: hackathonSubmissions.aiTools,
          aiStatement: hackathonSubmissions.aiStatement,
          originalWorkAttestedAt: hackathonSubmissions.originalWorkAttestedAt,
          submittedAt: hackathonSubmissions.submittedAt,
          submittedBy: bound(input.captainId, 'submitted_by'),
        })
        .from(hackathonSubmissions)
        .where(
          and(
            eq(hackathonSubmissions.teamId, input.teamId),
            eq(hackathonSubmissions.version, input.version + 1),
            sql`changes() = 1`,
          ),
        ),
    ),
  ]);
  return updated[0]?.version ?? null;
};
