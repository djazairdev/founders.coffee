import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const REQUIRED_STAGING_JOBS = [
  'Verify / Format, sync, typecheck, lint and test',
  'Verify / Server functions tests',
  'Verify / Build and Miniflare SEO gate',
  'Migrate and deploy',
];

export const REQUIRED_PULL_REQUEST_JOBS = [
  'Format, sync, typecheck, lint and test',
  'Server functions tests',
  'Build and Miniflare SEO gate',
  'Verification evidence',
];

const isTreeId = (value) =>
  typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);

const isTimestamp = (value) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

const isSuccessfulStagingRun = (run, sourceBranch) =>
  run?.event === 'push' &&
  run?.head_branch === sourceBranch &&
  run?.status === 'completed' &&
  run?.conclusion === 'success' &&
  isTreeId(run?.head_commit?.tree_id) &&
  isTimestamp(run?.updated_at) &&
  typeof run?.html_url === 'string' &&
  run.html_url.length > 0 &&
  typeof run?.id === 'number';

export const hasSuccessfulStagingJobs = (jobs) =>
  REQUIRED_STAGING_JOBS.every((name) =>
    jobs.some(
      (job) =>
        job?.name === name &&
        job?.status === 'completed' &&
        job?.conclusion === 'success',
    ),
  );

const hasSuccessfulPullRequestJobs = (jobs) =>
  REQUIRED_PULL_REQUEST_JOBS.every((name) =>
    jobs.some(
      (job) =>
        job?.name === name &&
        job?.status === 'completed' &&
        job?.conclusion === 'success',
    ),
  );

export const findVerifiedStagingRun = async ({
  currentRunCreatedAt,
  getJobs,
  runs,
  sourceBranch,
  targetTree,
}) => {
  if (!isTimestamp(currentRunCreatedAt)) return null;
  for (const run of runs) {
    if (!isSuccessfulStagingRun(run, sourceBranch)) continue;
    if (run.head_commit.tree_id !== targetTree) continue;
    if (Date.parse(run.updated_at) >= Date.parse(currentRunCreatedAt)) continue;
    const payload = await getJobs(run.id);
    if (!hasSuccessfulStagingJobs(payload.jobs ?? [])) continue;
    return run;
  }
  return null;
};

export const findVerifiedPullRequestRun = async ({
  currentRunCreatedAt,
  getJobs,
  getPullRequest,
  repository,
  runs,
  sourceBranch,
  targetSha,
  targetTree,
}) => {
  if (!isTimestamp(currentRunCreatedAt)) return null;
  for (const run of runs) {
    if (
      run?.event !== 'pull_request' ||
      run?.status !== 'completed' ||
      run?.conclusion !== 'success' ||
      run?.head_commit?.tree_id !== targetTree ||
      !isTimestamp(run?.updated_at) ||
      Date.parse(run.updated_at) >= Date.parse(currentRunCreatedAt) ||
      typeof run?.html_url !== 'string' ||
      run.html_url.length === 0 ||
      typeof run?.id !== 'number'
    ) {
      continue;
    }
    const pullRequest = run.pull_requests?.find(
      (candidate) =>
        candidate?.base?.ref === sourceBranch &&
        candidate?.base?.repo?.full_name === repository &&
        typeof candidate?.number === 'number',
    );
    if (!pullRequest) continue;
    const mergedPullRequest = await getPullRequest(pullRequest.number);
    if (
      mergedPullRequest?.merged !== true ||
      mergedPullRequest?.base?.ref !== sourceBranch ||
      mergedPullRequest?.head?.repo?.full_name !== repository ||
      mergedPullRequest?.merge_commit_sha !== targetSha
    ) {
      continue;
    }
    const payload = await getJobs(run.id);
    if (!hasSuccessfulPullRequestJobs(payload.jobs ?? [])) continue;
    return run;
  }
  return null;
};

export const workflowRunsUrl = ({ event, repository, sourceBranch }) => {
  const query = new URLSearchParams({
    event,
    per_page: '100',
    status: 'completed',
  });
  const branchQuery = event === 'push' ? `&branch=${sourceBranch}` : '';
  const workflow = event === 'push' ? 'deploy.yml' : 'ci.yml';
  return `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs?${query}${branchQuery}`;
};

const jobsUrl = (repository, runId) =>
  `https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs?filter=latest&per_page=100`;

const workflowRunUrl = (repository, runId) =>
  `https://api.github.com/repos/${repository}/actions/runs/${runId}`;

const pullRequestUrl = (repository, number) =>
  `https://api.github.com/repos/${repository}/pulls/${number}`;

export const createGitHubRequester = ({ fetchImpl = fetch, token }) => {
  return async (url) => {
    if (!token) throw new Error('GitHub token is unavailable');
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'founders-coffee-ci',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API request failed with ${response.status}`);
    }
    return response.json();
  };
};

export const resolveReuse = async ({
  eventName,
  getCurrentRun,
  getJobs,
  getPullRequest,
  getRuns,
  repository,
  sourceBranch,
  targetBranch,
  targetSha,
  targetTree,
}) => {
  if (eventName !== 'push') return { reason: 'not_a_push', reuse: false };
  if (!['main', 'develop'].includes(targetBranch))
    return { reason: 'not_release_branch', reuse: false };
  if (!isTreeId(targetTree))
    return { reason: 'invalid_target_tree', reuse: false };
  try {
    const current = await getCurrentRun();
    if (
      current?.event !== 'push' ||
      current?.head_branch !== targetBranch ||
      current?.head_sha !== targetSha ||
      current?.head_commit?.tree_id !== targetTree ||
      !isTimestamp(current?.created_at)
    ) {
      return { reason: 'current_run_mismatch', reuse: false };
    }
    const payload = await getRuns();
    const source =
      targetBranch === 'main'
        ? await findVerifiedStagingRun({
            currentRunCreatedAt: current.created_at,
            getJobs,
            runs: payload.workflow_runs ?? [],
            sourceBranch,
            targetTree,
          })
        : await findVerifiedPullRequestRun({
            currentRunCreatedAt: current.created_at,
            getJobs,
            getPullRequest,
            repository,
            runs: payload.workflow_runs ?? [],
            sourceBranch,
            targetSha,
            targetTree,
          });
    if (source === null)
      return {
        reason:
          targetBranch === 'main'
            ? 'no_verified_staging_tree'
            : 'no_verified_pull_request_tree',
        reuse: false,
      };
    return {
      reason:
        targetBranch === 'main'
          ? 'verified_staging_tree'
          : 'verified_pull_request_tree',
      reuse: true,
      sourceRunUrl: source.html_url,
      tree: targetTree,
    };
  } catch {
    return { reason: 'lookup_failed', reuse: false };
  }
};

const writeOutput = (key, value, outputPath) => {
  const line = `${key}=${value}\n`;
  if (outputPath) {
    fs.appendFileSync(outputPath, line);
    return;
  }
  process.stdout.write(line);
};

export const emitReuseOutputs = (result, outputPath) => {
  writeOutput('reuse', String(result.reuse), outputPath);
  writeOutput('source_run_url', result.sourceRunUrl ?? '', outputPath);
  writeOutput('tree', result.tree ?? '', outputPath);
};

const main = async () => {
  const repository = process.env.GITHUB_REPOSITORY ?? '';
  const sourceBranch = 'develop';
  const targetBranch = process.env.GITHUB_REF_NAME ?? '';
  const requester = createGitHubRequester({
    token: process.env.GITHUB_TOKEN ?? '',
  });
  const result = await resolveReuse({
    eventName: process.env.GITHUB_EVENT_NAME ?? '',
    getCurrentRun: () =>
      requester(workflowRunUrl(repository, process.env.GITHUB_RUN_ID ?? '')),
    getJobs: (runId) => requester(jobsUrl(repository, runId)),
    getPullRequest: (number) => requester(pullRequestUrl(repository, number)),
    getRuns: () =>
      requester(
        workflowRunsUrl({
          event: targetBranch === 'main' ? 'push' : 'pull_request',
          repository,
          sourceBranch,
        }),
      ),
    repository,
    sourceBranch,
    targetBranch,
    targetSha: process.env.GITHUB_SHA ?? '',
    targetTree: process.env.TARGET_TREE ?? '',
  });
  emitReuseOutputs(result, process.env.GITHUB_OUTPUT);
  process.stdout.write(`::notice::Verification reuse: ${result.reason}\n`);
};

const isCli =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isCli) await main();
