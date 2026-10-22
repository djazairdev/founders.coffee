import { describe, expect, it } from 'vitest';

import { countPullRequests, decidePullRequestStatus } from './pull-requests.js';

const HOUR = 3_600_000;
const kickoffAt = Date.parse('2099-01-15T18:00:00Z');
const timeline = {
  registrationOpensAt: kickoffAt - 10 * 24 * HOUR,
  registrationClosesAt: kickoffAt - HOUR,
  kickoffAt,
  submissionDeadlineAt: kickoffAt + 48 * HOUR,
  endsAt: kickoffAt + 72 * HOUR,
  judgingEndsAt: kickoffAt + 96 * HOUR,
};
const PR = 'https://github.com/djazairdev/founders.coffee/pull/1';

const decide = (
  changes: Partial<Parameters<typeof decidePullRequestStatus>[0]> = {},
) =>
  decidePullRequestStatus({
    timeline,
    now: kickoffAt + 60 * HOUR,
    isResultsPublished: false,
    entry: { status: 'submitted', submittedPullRequestUrls: [PR] },
    url: PR,
    ...changes,
  });

const codeOf = (result: ReturnType<typeof decide>) =>
  result.ok ? null : result.error.code;

describe('recording what maintainers did with a pull request (B-SUB-08)', () => {
  it('lets organisers record a pull request the entry submitted, from kickoff until results', () => {
    expect(decide().ok).toBe(true);
    expect(decide({ now: kickoffAt + HOUR }).ok).toBe(true);
    expect(codeOf(decide({ now: kickoffAt - 1 }))).toBe('building_not_started');
    expect(codeOf(decide({ isResultsPublished: true }))).toBe(
      'results_published',
    );
  });

  it('refuses an entry never submitted, a disqualified one, and a link it did not submit', () => {
    expect(codeOf(decide({ entry: null }))).toBe('submission_not_found');
    expect(
      codeOf(
        decide({ entry: { status: 'draft', submittedPullRequestUrls: [] } }),
      ),
    ).toBe('submission_not_found');
    expect(
      codeOf(
        decide({
          entry: { status: 'disqualified', submittedPullRequestUrls: [PR] },
        }),
      ),
    ).toBe('submission_locked');
    expect(codeOf(decide({ url: `${PR}0` }))).toBe('pull_request_not_found');
  });

  it('counts submitted, reviewed and merged, each holding those further along', () => {
    const urls = ['a', 'b', 'c', 'd'].map((path) => `${PR}/${path}`);
    const statuses = new Map([
      [urls[0] ?? '', 'merged' as const],
      [urls[1] ?? '', 'reviewed' as const],
      [`${PR}/gone`, 'merged' as const],
    ]);

    expect(countPullRequests(urls, statuses)).toEqual({
      submitted: 4,
      reviewed: 2,
      merged: 1,
    });
    expect(countPullRequests([], statuses)).toEqual({
      submitted: 0,
      reviewed: 0,
      merged: 0,
    });
  });
});
