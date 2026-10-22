import { and, eq, ne, sql, type SQL } from 'drizzle-orm';

import type { HackathonSubmissionStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import { bound } from './insert-select.js';
import {
  events,
  hackathons,
  hackathonSubmissions,
  hackathonTeamMembers,
} from './schema.js';

export type SubmissionDraftFields = {
  readonly trackId: string | null;
  readonly title: string;
  readonly description: string;
  readonly repositoryUrl: string | null;
  readonly demoVideoUrl: string | null;
  readonly pullRequestUrls: readonly string[];
  readonly aiTools: readonly string[];
  readonly aiStatement: string | null;
};

export type TeamSubmissionRead = {
  readonly id: string;
  readonly status: HackathonSubmissionStatus;
  readonly version: number;
};

type Captain = {
  readonly eventId: string;
  readonly teamId: string;
  readonly captainId: string;
};

/**
 * Whether the member captains the team and the team is building: the hackathon is published, its
 * kickoff has come and its submission deadline is ahead.
 */
const captainBuilding = (input: Captain): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathonTeamMembers} JOIN ${hackathons} ON ${hackathons.eventId} = ${hackathonTeamMembers.eventId} JOIN ${events} ON ${events.id} = ${hackathonTeamMembers.eventId} WHERE ${hackathonTeamMembers.teamId} = ${input.teamId} AND ${hackathonTeamMembers.eventId} = ${input.eventId} AND ${hackathonTeamMembers.userId} = ${input.captainId} AND ${hackathonTeamMembers.isCaptain} = 1 AND ${events.status} = 'published' AND ${events.startsAt} <= unixepoch() AND ${hackathons.submissionDeadlineAt} > unixepoch())`;

/** The team's submission, its status and version, or `null` before its first save. */
export const readTeamSubmission = async (
  db: Db,
  teamId: string,
): Promise<TeamSubmissionRead | null> => {
  const [row] = await db
    .select({
      id: hackathonSubmissions.id,
      status: hackathonSubmissions.status,
      version: hackathonSubmissions.version,
    })
    .from(hackathonSubmissions)
    .where(eq(hackathonSubmissions.teamId, teamId));
  return row ?? null;
};

/**
 * Save the team's first draft (B-SUB-03) at version 1, written from the captain's own membership
 * only while the team is building and has no submission yet. Returns whether it was written.
 */
export const createSubmissionDraft = async (
  db: Db,
  input: Captain & {
    readonly id: string;
    readonly draft: SubmissionDraftFields;
  },
): Promise<boolean> => {
  const { draft } = input;
  const result = await db.insert(hackathonSubmissions).select(
    db
      .select({
        id: bound(input.id, 'id'),
        eventId: hackathonTeamMembers.eventId,
        teamId: hackathonTeamMembers.teamId,
        trackId: bound(draft.trackId, 'track_id'),
        title: bound(draft.title, 'title'),
        description: bound(draft.description, 'description'),
        repositoryUrl: bound(draft.repositoryUrl, 'repository_url'),
        demoVideoUrl: bound(draft.demoVideoUrl, 'demo_video_url'),
        pullRequestUrls: bound(
          JSON.stringify(draft.pullRequestUrls),
          'pull_request_urls',
        ),
        aiTools: bound(JSON.stringify(draft.aiTools), 'ai_tools'),
        aiStatement: bound(draft.aiStatement, 'ai_statement'),
        originalWorkAttestedAt: bound(null, 'original_work_attested_at'),
        status: sql<HackathonSubmissionStatus>`'draft'`.as('status'),
        submittedAt: bound(null, 'submitted_at'),
        version: sql<number>`1`.as('version'),
        createdAt: sql`unixepoch()`.as('created_at'),
        updatedAt: sql`unixepoch()`.as('updated_at'),
      })
      .from(hackathonTeamMembers)
      .where(
        and(
          eq(hackathonTeamMembers.teamId, input.teamId),
          eq(hackathonTeamMembers.userId, input.captainId),
          captainBuilding(input),
          sql`NOT EXISTS (SELECT 1 FROM ${hackathonSubmissions} WHERE ${hackathonSubmissions.teamId} = ${input.teamId})`,
        ),
      ),
  );
  return ((result.meta?.changes ?? 0) as number) > 0;
};

/**
 * Save the team's draft over what it has (B-SUB-03), only at the version the captain saw, while
 * the team is building and the entry is not disqualified; the version then moves on. An entry
 * already submitted keeps its status, which the table's checks hold to complete. Returns the new
 * version, or `null` when nothing was written.
 */
export const updateSubmissionDraft = async (
  db: Db,
  input: Captain & {
    readonly version: number;
    readonly draft: SubmissionDraftFields;
  },
): Promise<number | null> => {
  const { draft } = input;
  const [row] = await db
    .update(hackathonSubmissions)
    .set({
      trackId: draft.trackId,
      title: draft.title,
      description: draft.description,
      repositoryUrl: draft.repositoryUrl,
      demoVideoUrl: draft.demoVideoUrl,
      pullRequestUrls: [...draft.pullRequestUrls],
      aiTools: [...draft.aiTools],
      aiStatement: draft.aiStatement,
      version: sql`${hackathonSubmissions.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hackathonSubmissions.teamId, input.teamId),
        eq(hackathonSubmissions.eventId, input.eventId),
        eq(hackathonSubmissions.version, input.version),
        ne(hackathonSubmissions.status, 'disqualified'),
        captainBuilding(input),
      ),
    )
    .returning({ version: hackathonSubmissions.version });
  return row?.version ?? null;
};
