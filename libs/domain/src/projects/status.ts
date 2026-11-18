import {
  AppError,
  err,
  ok,
  type ProjectStatus,
  type Result,
} from '@founders-coffee/core';

const TRANSITIONS: Readonly<Record<ProjectStatus, readonly ProjectStatus[]>> = {
  draft: ['published'],
  published: ['hidden'],
  hidden: ['published'],
};

/**
 * Decide whether a project may move from one status to another (B-PRJ-01). A draft is published
 * once; a published project can be hidden and shown again, but never goes back to being a draft,
 * since people may already have linked to it.
 */
export const decideProjectStatus = (
  from: ProjectStatus,
  to: ProjectStatus,
): Result<ProjectStatus> =>
  TRANSITIONS[from].includes(to)
    ? ok(to)
    : err(
        new AppError(
          'invalid_project_transition',
          `A project cannot go from ${from} to ${to}`,
        ),
      );

/**
 * Whether search engines may index a project's page (V17): only a published one, and only when its
 * team turned that on.
 */
export const isProjectIndexable = (project: {
  readonly status: ProjectStatus;
  readonly isSearchIndexable: boolean;
}): boolean => project.status === 'published' && project.isSearchIndexable;
