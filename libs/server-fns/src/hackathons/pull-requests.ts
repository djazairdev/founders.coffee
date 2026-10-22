import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  listHackathonPullRequests,
  readPullRequestEntry,
  setPullRequestStatus,
  type Db,
  type HackathonPullRequestRow,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { loadPlaceHackathon } from './place-context.js';

export type HackathonPullRequestEntry = HackathonPullRequestRow & {
  readonly counts: hackathons.PullRequestCounts;
};

/**
 * Every open-source entry's pull requests for the hackathon's organisers (B-SUB-08), as the
 * maintainers left them, with each entry's count of submitted, reviewed and merged.
 */
export const listPullRequestsResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<readonly HackathonPullRequestEntry[]>> => {
  const loaded = await loadPlaceHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  return ok(
    (await listHackathonPullRequests(db, eventId)).map((entry) => ({
      ...entry,
      counts: hackathons.countPullRequests(
        entry.pullRequests.map((pullRequest) => pullRequest.url),
        new Map(
          entry.pullRequests.map((pullRequest) => [
            pullRequest.url,
            pullRequest.status,
          ]),
        ),
      ),
    })),
  );
};

/**
 * Record what maintainers did with one pull request of an open-source entry (B-SUB-08). The rule
 * decides first; the write decides again in one statement, and when it lands nothing the rule is
 * asked again so the refusal says why.
 */
export const setPullRequestStatusResolver = async (
  db: Db,
  input: hackathons.PullRequestStatusChange,
  now: number = Date.now(),
): Promise<Result<{ readonly status: typeof input.status }>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async () => {
    const entry = await readPullRequestEntry(db, input);
    return hackathons.decidePullRequestStatus({
      timeline: loaded.data.timeline,
      now,
      isResultsPublished: entry?.isResultsPublished ?? false,
      entry,
      url: input.url,
    });
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  if (!(await setPullRequestStatus(db, input))) {
    const again = await decide();
    return again.ok
      ? err(new AppError('submission_conflict', 'The entry changed meanwhile'))
      : again;
  }
  logger.info('hackathon.pull_request_recorded', {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
    status: input.status,
  });
  return ok({ status: input.status });
};
