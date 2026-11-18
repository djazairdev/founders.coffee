import {
  AppError,
  err,
  id,
  ok,
  shortId,
  type ProjectStatus,
  type Result,
} from '@founders-coffee/core';
import {
  confirmProjectMember,
  createProjectFromEntry,
  publishDraftProject,
  readParticipantStanding,
  readProjectStanding,
  readTeamEntryProject,
  type Db,
  type TeamEntryProject,
} from '@founders-coffee/db';
import { projects } from '@founders-coffee/domain';
import { logger, type Metrics } from '@founders-coffee/observability';

import { recordHackathonMetric } from '../hackathons/metrics.js';
import { loadTeamHackathon } from '../hackathons/team-context.js';

const SLUG_SUFFIX_LENGTH = 8;

export type TeamProjectView =
  | { readonly stage: 'can_create' }
  | {
      readonly stage: 'made';
      readonly id: string;
      readonly slug: string;
      readonly title: string;
      readonly status: ProjectStatus;
      readonly isOwner: boolean;
      readonly isOnProject: boolean;
      readonly isListed: boolean;
      readonly teammates: number;
      readonly confirmedTeammates: number;
      readonly canPublish: boolean;
    };

const projectNotFound = () =>
  err(new AppError('project_not_found', 'This project does not exist'));

/**
 * What the team page shows a member about their team's project (B-PRJ-02): the choice to make one
 * for a captain whose entry can become one, what was made for anyone on the team, nothing otherwise.
 */
export const teamProjectViewOf = (
  entry: TeamEntryProject | null,
  viewer: { readonly userId: string; readonly isCaptain: boolean },
): TeamProjectView | null => {
  if (!entry) return null;
  const { project } = entry;
  if (!project)
    return viewer.isCaptain && entry.entryStatus === 'submitted'
      ? { stage: 'can_create' }
      : null;
  const own = project.members.find((row) => row.userId === viewer.userId);
  const teammates = project.members.filter((row) => row.role !== 'owner');
  const isOwner = own?.role === 'owner';
  return {
    stage: 'made',
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    isOwner,
    isOnProject: own !== undefined,
    isListed: own?.isListed ?? false,
    teammates: teammates.length,
    confirmedTeammates: teammates.filter((row) => row.isListed).length,
    canPublish:
      isOwner &&
      projects.decidePublishProject({
        status: project.status,
        isOwner,
        isEntryDisqualified: entry.entryStatus === 'disqualified',
        members: project.members,
      }).ok,
  };
};

/**
 * Make a draft project from the entry of the captain's team (B-PRJ-02), with its fields copied from
 * what the results froze and the result linked through the entry. The team comes from the captain's
 * own place in it, so nobody can make one from another team's entry.
 */
export const createProjectFromEntryResolver = async (
  db: Db,
  metrics: Metrics | null,
  input: { readonly eventId: string; readonly userId: string },
): Promise<Result<{ readonly projectId: string; readonly slug: string }>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const { event, resultsPublishedAt } = loaded.data;
  const { membership } = await readParticipantStanding(db, input);
  const entry = membership
    ? await readTeamEntryProject(db, {
        eventId: input.eventId,
        teamId: membership.teamId,
      })
    : null;
  const decided = projects.decideProjectFromEntry({
    isResultsPublished: resultsPublishedAt !== null,
    isCaptain: membership?.isCaptain ?? false,
    entryStatus: entry?.entryStatus ?? null,
    hasProject: entry?.project != null,
  });
  if (!decided.ok) return decided;
  if (!entry || !membership) return projectNotFound();
  const projectId = id('prj');
  const slug = projects.projectSlugFor(
    entry.title,
    shortId(projectId).slice(0, SLUG_SUFFIX_LENGTH),
  );
  const isCreated = await createProjectFromEntry(db, {
    ...projects.projectFromEntry(entry),
    id: projectId,
    slug,
    marketCode: event.marketCode,
    submissionId: entry.submissionId,
    teamId: membership.teamId,
    captainId: input.userId,
  });
  if (!isCreated)
    return err(new AppError('project_exists', 'The project already exists'));
  recordHackathonMetric(metrics, 'project_created', {
    marketCode: event.marketCode,
    hackathonId: input.eventId,
  });
  logger.info('Project made from a hackathon entry', {
    eventId: input.eventId,
    projectId,
  });
  return ok({ projectId, slug });
};

/** List the member on a project made from their team's entry (B-PRJ-02); nobody else can be. */
export const confirmProjectListingResolver = async (
  db: Db,
  input: { readonly projectId: string; readonly userId: string },
): Promise<Result<{ readonly isListed: true }>> =>
  (await confirmProjectMember(db, input))
    ? ok({ isListed: true })
    : projectNotFound();

/**
 * Publish a draft project (B-PRJ-02): its owner, the team's captain, does it once at least one
 * teammate confirmed. Someone not on the project is told it does not exist.
 */
export const publishProjectResolver = async (
  db: Db,
  metrics: Metrics | null,
  input: { readonly projectId: string; readonly userId: string },
): Promise<Result<{ readonly isPublished: true }>> => {
  const standing = await readProjectStanding(db, input.projectId);
  const own = standing?.members.find((row) => row.userId === input.userId);
  if (!standing || !own) return projectNotFound();
  const decided = projects.decidePublishProject({
    status: standing.status,
    isOwner: own.role === 'owner',
    isEntryDisqualified: standing.entryStatus === 'disqualified',
    members: standing.members,
  });
  if (!decided.ok) return decided;
  const isPublished = await publishDraftProject(db, {
    projectId: input.projectId,
    ownerId: input.userId,
  });
  if (!isPublished)
    return err(
      new AppError(
        'invalid_project_transition',
        'This project changed in the meantime',
      ),
    );
  if (standing.eventId)
    recordHackathonMetric(metrics, 'project_published', {
      marketCode: standing.marketCode,
      hackathonId: standing.eventId,
    });
  return ok({ isPublished: true });
};
