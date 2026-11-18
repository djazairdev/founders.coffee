import {
  AppError,
  err,
  ok,
  type ProjectMemberRole,
  type ProjectStage,
  type ProjectStatus,
  type Result,
} from '@founders-coffee/core';
import {
  hackathonsEnabled,
  leaveProject,
  readProjectEditor,
  readProjectStanding,
  saveProjectEdit,
  type Db,
} from '@founders-coffee/db';
import { projects } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

export type ProjectEditor = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly status: ProjectStatus;
  readonly stage: ProjectStage;
  readonly description: string;
  readonly repositoryUrl: string | null;
  readonly demoUrl: string | null;
  readonly websiteUrl: string | null;
  readonly isSearchIndexable: boolean;
  readonly version: number;
  readonly role: ProjectMemberRole;
  readonly canLeave: boolean;
};

const notFound = () =>
  err(new AppError('project_not_found', 'This project does not exist'));

/**
 * What a member of a project sees on its edit screen (B-PRJ-04). Someone who is not on it, and a
 * project in a market with hackathons off, read as not found, so nothing here reveals a draft.
 */
export const projectEditorResolver = async (
  db: Db,
  input: { readonly slug: string; readonly userId: string },
): Promise<Result<ProjectEditor>> => {
  const row = await readProjectEditor(db, input);
  if (!row || !(await hackathonsEnabled(db, row.marketCode))) return notFound();
  return ok({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    stage: row.stage,
    description: row.description,
    repositoryUrl: row.repositoryUrl,
    demoUrl: row.demoUrl,
    websiteUrl: row.websiteUrl,
    isSearchIndexable: row.isSearchIndexable,
    version: row.version,
    role: row.role,
    canLeave: row.memberCount > 1,
  });
};

/** The project with who is on it, when its market still has hackathons on. */
const standingOf = async (db: Db, projectId: string) => {
  const standing = await readProjectStanding(db, projectId);
  return standing && (await hackathonsEnabled(db, standing.marketCode))
    ? standing
    : null;
};

/**
 * An owner edits a project's stage, description, links and search listing (B-PRJ-04). The edit
 * carries the version it was made from, and one made from an older version is refused
 * (`stale_version`). Saving moves the date the page shows as its last update.
 */
export const updateProjectResolver = async (
  db: Db,
  input: projects.ProjectEdit & { readonly userId: string },
): Promise<Result<{ readonly version: number }>> => {
  const { projectId, expectedVersion, userId, ...fields } = input;
  const standing = await standingOf(db, projectId);
  const own = standing?.members.find((row) => row.userId === userId);
  if (!own) return notFound();
  if (own.role !== 'owner')
    return err(
      new AppError('not_project_owner', 'Only an owner can edit this project'),
    );
  const version = await saveProjectEdit(db, {
    projectId,
    ownerId: userId,
    expectedVersion,
    fields,
    now: new Date(),
  });
  if (version === null)
    return err(
      new AppError('stale_version', 'This project changed since it was opened'),
    );
  logger.info('Project edited', { projectId, version });
  return ok({ version });
};

/** A member takes themselves off a project (B-PRJ-04); see {@link leaveProject} for its owner. */
export const leaveProjectResolver = async (
  db: Db,
  input: { readonly projectId: string; readonly userId: string },
): Promise<Result<{ readonly left: true }>> => {
  const standing = await standingOf(db, input.projectId);
  const decided = projects.decideLeaveProject({
    isOnProject:
      standing?.members.some((row) => row.userId === input.userId) ?? false,
    memberCount: standing?.members.length ?? 0,
  });
  if (!decided.ok) return decided;
  if (!(await leaveProject(db, input)))
    return err(
      new AppError('project_last_member', 'Nobody else is on this project'),
    );
  logger.info('Member left a project', { projectId: input.projectId });
  return ok({ left: true });
};
