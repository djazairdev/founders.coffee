import { describe, expect, it } from 'vitest';

import {
  REQUIRED_PULL_REQUEST_JOBS,
  findVerifiedPullRequestRun,
  resolveReuse,
  workflowRunsUrl,
} from './verified-staging-tree.mjs';

const targetTree = 'a'.repeat(40);
const targetSha = 'd'.repeat(40);

const pullRequestRun = (overrides = {}) => ({
  conclusion: 'success',
  event: 'pull_request',
  head_commit: { tree_id: targetTree },
  html_url: 'https://github.com/example/repo/actions/runs/51',
  id: 51,
  pull_requests: [
    {
      base: { ref: 'develop', repo: { full_name: 'example/repo' } },
      number: 7,
    },
  ],
  status: 'completed',
  updated_at: '2026-09-15T16:00:00Z',
  ...overrides,
});

const successfulJobs = () =>
  REQUIRED_PULL_REQUEST_JOBS.map((name) => ({
    conclusion: 'success',
    name,
    status: 'completed',
  }));

const mergedPullRequest = (overrides = {}) => ({
  base: { ref: 'develop' },
  head: { repo: { full_name: 'example/repo' } },
  merge_commit_sha: targetSha,
  merged: true,
  ...overrides,
});

const findRun = (overrides = {}) =>
  findVerifiedPullRequestRun({
    currentRunCreatedAt: '2026-09-15T16:15:00Z',
    getJobs: async () => ({ jobs: successfulJobs() }),
    getPullRequest: async () => mergedPullRequest(),
    repository: 'example/repo',
    runs: [pullRequestRun()],
    sourceBranch: 'develop',
    targetSha,
    targetTree,
    ...overrides,
  });

describe('findVerifiedPullRequestRun', () => {
  it('reuses only successful checks for a merged PR with the exact tree and merge SHA', async () => {
    await expect(findRun()).resolves.toMatchObject({ id: 51 });
  });

  it('rejects PR evidence when any required check or merge identity differs', async () => {
    await expect(
      findRun({
        getJobs: async () => ({ jobs: successfulJobs().slice(0, 3) }),
      }),
    ).resolves.toBeNull();
    await expect(findRun({ targetSha: 'e'.repeat(40) })).resolves.toBeNull();
  });

  it('rejects unmerged, wrong-base, and cross-repository PR evidence', async () => {
    await expect(
      findRun({
        getPullRequest: async () => mergedPullRequest({ merged: false }),
      }),
    ).resolves.toBeNull();
    await expect(
      findRun({
        getPullRequest: async () =>
          mergedPullRequest({ base: { ref: 'main' } }),
      }),
    ).resolves.toBeNull();
    await expect(
      findRun({
        runs: [
          pullRequestRun({
            pull_requests: [
              {
                base: { ref: 'develop', repo: { full_name: 'fork/repo' } },
                number: 7,
              },
            ],
          }),
        ],
      }),
    ).resolves.toBeNull();
  });

  it('rejects PR runs that completed after the deployment check began', async () => {
    await expect(
      findRun({
        runs: [pullRequestRun({ updated_at: '2026-09-15T16:16:00Z' })],
      }),
    ).resolves.toBeNull();
  });
});

describe('develop verification reuse', () => {
  it('queries PR CI for staging and deploy runs for production evidence', () => {
    const stagingRuns = new URL(
      workflowRunsUrl({
        event: 'pull_request',
        repository: 'example/repo',
        sourceBranch: 'develop',
      }),
    );
    const productionRuns = new URL(
      workflowRunsUrl({
        event: 'push',
        repository: 'example/repo',
        sourceBranch: 'develop',
      }),
    );

    expect(stagingRuns.pathname).toContain('/workflows/ci.yml/runs');
    expect(stagingRuns.searchParams.get('event')).toBe('pull_request');
    expect(stagingRuns.searchParams.has('branch')).toBe(false);
    expect(productionRuns.pathname).toContain('/workflows/deploy.yml/runs');
    expect(productionRuns.searchParams.get('event')).toBe('push');
    expect(productionRuns.searchParams.get('branch')).toBe('develop');
  });

  it('uses the merged exact-tree PR and falls back when evidence is unavailable', async () => {
    const reuse = await resolveReuse({
      eventName: 'push',
      getCurrentRun: async () => ({
        created_at: '2026-09-15T16:15:00Z',
        event: 'push',
        head_branch: 'develop',
        head_commit: { tree_id: targetTree },
        head_sha: targetSha,
      }),
      getJobs: async () => ({ jobs: successfulJobs() }),
      getPullRequest: async () => mergedPullRequest(),
      getRuns: async () => ({ workflow_runs: [pullRequestRun()] }),
      repository: 'example/repo',
      sourceBranch: 'develop',
      targetBranch: 'develop',
      targetSha,
      targetTree,
    });

    expect(reuse).toMatchObject({
      reason: 'verified_pull_request_tree',
      reuse: true,
      tree: targetTree,
    });

    await expect(
      resolveReuse({
        eventName: 'push',
        getCurrentRun: async () => ({
          created_at: '2026-09-15T16:15:00Z',
          event: 'push',
          head_branch: 'develop',
          head_commit: { tree_id: targetTree },
          head_sha: targetSha,
        }),
        getJobs: async () => ({ jobs: successfulJobs().slice(0, 3) }),
        getPullRequest: async () => mergedPullRequest(),
        getRuns: async () => ({ workflow_runs: [pullRequestRun()] }),
        repository: 'example/repo',
        sourceBranch: 'develop',
        targetBranch: 'develop',
        targetSha,
        targetTree,
      }),
    ).resolves.toEqual({
      reason: 'no_verified_pull_request_tree',
      reuse: false,
    });
  });
});
