import { z } from 'zod';

import {
  AppError,
  err,
  hackathonPullRequestStatusSchema,
  idSchema,
  ok,
  type HackathonPullRequestStatus,
  type HackathonSubmissionStatus,
  type Result,
} from '@founders-coffee/core';

import { submissionUrlSchema } from './submissions.js';
import type { HackathonTimeline } from './timeline.js';

export const hackathonPullRequestsSchema = z.strictObject({
  eventId: idSchema,
});

export const pullRequestStatusChangeSchema = z.strictObject({
  eventId: idSchema,
  submissionId: idSchema,
  url: submissionUrlSchema,
  status: hackathonPullRequestStatusSchema,
});

export type PullRequestStatusChange = z.infer<
  typeof pullRequestStatusChangeSchema
>;

export type PullRequestCounts = {
  readonly submitted: number;
  readonly reviewed: number;
  readonly merged: number;
};

/**
 * Decide whether an organiser may record what maintainers did with one pull request of an
 * open-source entry (B-SUB-08): once the hackathon has begun and until its results are published,
 * for an entry that was submitted and not disqualified, and a pull request in the version it last
 * submitted. Merges stay the maintainers' decision; this only records it.
 */
export const decidePullRequestStatus = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly isResultsPublished: boolean;
  readonly entry: {
    readonly status: HackathonSubmissionStatus;
    readonly submittedPullRequestUrls: readonly string[];
  } | null;
  readonly url: string;
}): Result<true> => {
  if (input.now < input.timeline.kickoffAt)
    return err(
      new AppError('building_not_started', 'The hackathon has not begun'),
    );
  if (input.isResultsPublished)
    return err(
      new AppError('results_published', 'The results are already published'),
    );
  const { entry } = input;
  if (entry === null || entry.status === 'draft')
    return err(
      new AppError('submission_not_found', 'No submitted entry to record'),
    );
  if (entry.status === 'disqualified')
    return err(
      new AppError('submission_locked', 'This entry can no longer change'),
    );
  if (!entry.submittedPullRequestUrls.includes(input.url))
    return err(
      new AppError(
        'pull_request_not_found',
        'The entry did not submit this pull request',
      ),
    );
  return ok(true);
};

/**
 * Count an entry's pull requests as the results show them (B-SUB-08): every one it submitted, the
 * ones maintainers reviewed, and the ones they merged, each count holding those further along, so a
 * merged pull request was also reviewed. A pull request nobody recorded is only submitted, and a
 * status recorded for a link the entry no longer has does not count.
 */
export const countPullRequests = (
  urls: readonly string[],
  statuses: ReadonlyMap<string, HackathonPullRequestStatus>,
): PullRequestCounts => {
  const statusesOf = urls.map((url) => statuses.get(url) ?? 'submitted');
  return {
    submitted: urls.length,
    reviewed: statusesOf.filter((status) => status !== 'submitted').length,
    merged: statusesOf.filter((status) => status === 'merged').length,
  };
};
