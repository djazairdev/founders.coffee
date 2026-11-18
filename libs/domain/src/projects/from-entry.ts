import {
  AppError,
  err,
  ok,
  PROJECT_PROBLEM_MAX,
  PROJECT_SLUG_MAX,
  PROJECT_SLUG_MIN,
  type HackathonSubmissionStatus,
  type ProjectMemberRole,
  type ProjectStage,
  type ProjectStatus,
  type Result,
} from '@founders-coffee/core';

const ENTRY_STAGE: ProjectStage = 'prototype';
const FALLBACK_SLUG = 'project';

/**
 * A project's address from its title and a random suffix (B-PRJ-02). A title with no Latin letters
 * or digits, an Arabic one for instance, leaves too little to read, so the address says `project`.
 */
export const projectSlugFor = (title: string, suffix: string): string => {
  const words = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, '-')
    .replaceAll(/^-+|-+$/gu, '');
  const room = PROJECT_SLUG_MAX - suffix.length - 1;
  const base = words.slice(0, room).replaceAll(/-+$/gu, '');
  return `${base.length >= PROJECT_SLUG_MIN ? base : FALLBACK_SLUG}-${suffix}`;
};

/**
 * The draft project an entry becomes (B-PRJ-02), from what it was last submitted as. An entry has no
 * problem of its own, so the project starts from the brief of its track, or its description when the
 * track is gone; a working entry counts as a prototype.
 */
export const projectFromEntry = (entry: {
  readonly title: string;
  readonly description: string;
  readonly brief: string | null;
  readonly repositoryUrl: string;
  readonly demoVideoUrl: string | null;
}) => ({
  title: entry.title,
  problem: (entry.brief ?? entry.description)
    .slice(0, PROJECT_PROBLEM_MAX)
    .trim(),
  description: entry.description,
  stage: ENTRY_STAGE,
  repositoryUrl: entry.repositoryUrl,
  demoUrl: entry.demoVideoUrl,
});

/**
 * Decide whether a captain may make a project from their team's entry (B-PRJ-02): only after the
 * results, only from an entry still in them, and only once. A disqualified entry cannot become one.
 */
export const decideProjectFromEntry = (input: {
  readonly isResultsPublished: boolean;
  readonly isCaptain: boolean;
  readonly entryStatus: HackathonSubmissionStatus | null;
  readonly hasProject: boolean;
}): Result<true> => {
  if (!input.isCaptain)
    return err(
      new AppError('not_team_captain', 'Only the captain can do this'),
    );
  if (!input.isResultsPublished || input.entryStatus !== 'submitted')
    return err(
      new AppError(
        'project_not_available',
        'This entry cannot become a project',
      ),
    );
  if (input.hasProject)
    return err(new AppError('project_exists', 'The project already exists'));
  return ok(true);
};

/**
 * Whether a project has the people it needs to be published (B-PRJ-02): at least one teammate who
 * confirmed. A team of one has nobody to wait for.
 */
export const hasProjectConfirmation = (
  members: readonly {
    readonly role: ProjectMemberRole;
    readonly isListed: boolean;
  }[],
): boolean => {
  const teammates = members.filter((member) => member.role !== 'owner');
  return teammates.length === 0 || teammates.some((member) => member.isListed);
};

/** Decide whether a member may publish a draft project (B-PRJ-02): only its owner can. */
export const decidePublishProject = (input: {
  readonly status: ProjectStatus;
  readonly isOwner: boolean;
  readonly isEntryDisqualified: boolean;
  readonly members: readonly {
    readonly role: ProjectMemberRole;
    readonly isListed: boolean;
  }[];
}): Result<true> => {
  if (!input.isOwner)
    return err(
      new AppError('not_project_owner', 'Only the owner can publish this'),
    );
  if (input.isEntryDisqualified)
    return err(
      new AppError(
        'project_not_available',
        'This entry cannot become a project',
      ),
    );
  if (input.status !== 'draft')
    return err(
      new AppError(
        'invalid_project_transition',
        `A project cannot go from ${input.status} to published`,
      ),
    );
  if (!hasProjectConfirmation(input.members))
    return err(
      new AppError(
        'project_needs_confirmation',
        'At least one teammate has to confirm first',
      ),
    );
  return ok(true);
};
