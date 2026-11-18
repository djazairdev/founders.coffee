import { AppError, err, ok, type Result } from '@founders-coffee/core';

/**
 * Decide whether a member may leave a project (B-PRJ-04). Anyone on it may, unless nobody else
 * would be left: a project with no one on it could never be kept up to date
 * (`project_last_member`). Someone who is not on it reads as not found, so the answer says nothing
 * about a draft.
 */
export const decideLeaveProject = (input: {
  readonly isOnProject: boolean;
  readonly memberCount: number;
}): Result<true> => {
  if (!input.isOnProject)
    return err(
      new AppError('project_not_found', 'This project does not exist'),
    );
  if (input.memberCount <= 1)
    return err(
      new AppError('project_last_member', 'Nobody else is on this project'),
    );
  return ok(true);
};
