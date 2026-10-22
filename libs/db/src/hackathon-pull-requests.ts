import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import type {
  HackathonPullRequestStatus,
  HackathonSubmissionStatus,
} from '@founders-coffee/core';

import type { Db } from './db.js';
import {
  events,
  hackathonPullRequests,
  hackathons,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeams,
} from './schema.js';

export type PullRequestEntry = {
  readonly status: HackathonSubmissionStatus;
  readonly submittedPullRequestUrls: readonly string[];
  readonly isResultsPublished: boolean;
};

export type HackathonPullRequestRow = {
  readonly submissionId: string;
  readonly teamName: string;
  readonly title: string;
  readonly pullRequests: readonly {
    readonly url: string;
    readonly status: HackathonPullRequestStatus;
  }[];
};

const lastSubmitted = sql`${hackathonSubmissionVersions.version} = (SELECT max(v.version) FROM hackathon_submission_versions v WHERE v.submission_id = ${hackathonSubmissionVersions.submissionId})`;

/**
 * An entry of a hackathon as recording its pull requests needs it (B-SUB-08): its status, the pull
 * requests of the version it last submitted, and whether the results are out. `null` when the entry
 * is not one of this hackathon's.
 */
export const readPullRequestEntry = async (
  db: Db,
  input: { readonly eventId: string; readonly submissionId: string },
): Promise<PullRequestEntry | null> => {
  const [row] = await db
    .select({
      status: hackathonSubmissions.status,
      urls: hackathonSubmissionVersions.pullRequestUrls,
      resultsPublishedAt: hackathons.resultsPublishedAt,
    })
    .from(hackathonSubmissions)
    .innerJoin(hackathons, eq(hackathons.eventId, hackathonSubmissions.eventId))
    .leftJoin(
      hackathonSubmissionVersions,
      and(
        eq(hackathonSubmissionVersions.submissionId, hackathonSubmissions.id),
        lastSubmitted,
      ),
    )
    .where(
      and(
        eq(hackathonSubmissions.id, input.submissionId),
        eq(hackathonSubmissions.eventId, input.eventId),
      ),
    );
  if (!row) return null;
  return {
    status: row.status,
    submittedPullRequestUrls: row.urls ?? [],
    isResultsPublished: row.resultsPublishedAt !== null,
  };
};

/**
 * Record what maintainers did with one pull request (B-SUB-08), replacing what was recorded before.
 * One statement makes the rule's decision again as it writes: the hackathon has begun and its
 * results are not out, the entry is submitted, and the pull request is in the version it last
 * submitted. Returns whether it landed.
 */
export const setPullRequestStatus = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly submissionId: string;
    readonly url: string;
    readonly status: HackathonPullRequestStatus;
  },
): Promise<boolean> => {
  const rows = await db
    .insert(hackathonPullRequests)
    .select(
      db
        .select({
          submissionId: hackathonSubmissions.id,
          url: sql<string>`${input.url}`.as('url'),
          status: sql<HackathonPullRequestStatus>`${input.status}`.as('status'),
          updatedAt: sql<number>`unixepoch()`.as('updated_at'),
        })
        .from(hackathonSubmissions)
        .innerJoin(
          hackathons,
          eq(hackathons.eventId, hackathonSubmissions.eventId),
        )
        .innerJoin(events, eq(events.id, hackathonSubmissions.eventId))
        .where(
          and(
            eq(hackathonSubmissions.id, input.submissionId),
            eq(hackathonSubmissions.eventId, input.eventId),
            eq(hackathonSubmissions.status, 'submitted'),
            isNull(hackathons.resultsPublishedAt),
            sql`${events.startsAt} <= unixepoch()`,
            sql`EXISTS (SELECT 1 FROM hackathon_submission_versions v, json_each(v.pull_request_urls) j WHERE v.submission_id = ${hackathonSubmissions.id} AND v.version = (SELECT max(version) FROM hackathon_submission_versions WHERE submission_id = v.submission_id) AND j.value = ${input.url})`,
          ),
        ),
    )
    .onConflictDoUpdate({
      target: [hackathonPullRequests.submissionId, hackathonPullRequests.url],
      set: { status: input.status, updatedAt: new Date() },
    })
    .returning({ url: hackathonPullRequests.url });
  return rows.length > 0;
};

/**
 * Every submitted entry of a hackathon that linked pull requests (B-SUB-08), with the team, the
 * project and each pull request of the version it last submitted, as the maintainers left it: a
 * pull request nobody recorded is submitted. Entries come in the order teams submitted them.
 */
export const listHackathonPullRequests = async (
  db: Db,
  eventId: string,
): Promise<readonly HackathonPullRequestRow[]> => {
  const entries = await db
    .select({
      submissionId: hackathonSubmissions.id,
      teamName: hackathonTeams.name,
      title: hackathonSubmissionVersions.title,
      urls: hackathonSubmissionVersions.pullRequestUrls,
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
        lastSubmitted,
      ),
    )
    .where(
      and(
        eq(hackathonSubmissions.eventId, eventId),
        eq(hackathonSubmissions.status, 'submitted'),
        sql`json_array_length(${hackathonSubmissionVersions.pullRequestUrls}) > 0`,
      ),
    )
    .orderBy(hackathonSubmissions.submittedAt, hackathonSubmissions.id);
  if (entries.length === 0) return [];
  const recorded = await db
    .select()
    .from(hackathonPullRequests)
    .where(
      inArray(
        hackathonPullRequests.submissionId,
        entries.map((entry) => entry.submissionId),
      ),
    );
  const statusOf = new Map(
    recorded.map((row) => [`${row.submissionId} ${row.url}`, row.status]),
  );
  return entries.map((entry) => ({
    submissionId: entry.submissionId,
    teamName: entry.teamName,
    title: entry.title,
    pullRequests: entry.urls.map((url) => ({
      url,
      status: statusOf.get(`${entry.submissionId} ${url}`) ?? 'submitted',
    })),
  }));
};
