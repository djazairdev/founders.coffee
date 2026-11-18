import { and, eq, sql } from 'drizzle-orm';

import type {
  HackathonSubmissionStatus,
  ProjectMemberRole,
  ProjectStage,
  ProjectStatus,
} from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { bound } from './insert-select.js';
import {
  hackathonResults,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeamMembers,
  hackathonTracks,
  projectMembers,
  projects,
} from './schema.js';

export type ProjectMemberStanding = {
  readonly userId: string;
  readonly role: ProjectMemberRole;
  readonly isListed: boolean;
};

export type TeamEntryProject = {
  readonly submissionId: string;
  readonly entryStatus: HackathonSubmissionStatus;
  readonly title: string;
  readonly description: string;
  readonly brief: string | null;
  readonly repositoryUrl: string;
  readonly demoVideoUrl: string | null;
  readonly project: {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly status: ProjectStatus;
    readonly members: readonly ProjectMemberStanding[];
  } | null;
};

const membersOf = (db: Db, projectId: string) =>
  db
    .select({
      userId: projectMembers.userId,
      role: projectMembers.role,
      isListed: projectMembers.isListed,
    })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));

/**
 * A team's entry as its frozen result last saw it (B-PRJ-02), and the project made from it if there
 * is one. `null` when the team has no result, which is also the answer before results are published.
 */
export const readTeamEntryProject = async (
  db: Db,
  input: { readonly eventId: string; readonly teamId: string },
): Promise<TeamEntryProject | null> => {
  const [row] = await db
    .select({
      submissionId: hackathonResults.submissionId,
      entryStatus: hackathonSubmissions.status,
      title: hackathonSubmissionVersions.title,
      description: hackathonSubmissionVersions.description,
      brief: hackathonTracks.brief,
      repositoryUrl: hackathonSubmissionVersions.repositoryUrl,
      demoVideoUrl: hackathonSubmissionVersions.demoVideoUrl,
      projectId: projects.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectStatus: projects.status,
    })
    .from(hackathonResults)
    .innerJoin(
      hackathonSubmissions,
      eq(hackathonSubmissions.id, hackathonResults.submissionId),
    )
    .innerJoin(
      hackathonSubmissionVersions,
      and(
        eq(
          hackathonSubmissionVersions.submissionId,
          hackathonResults.submissionId,
        ),
        eq(hackathonSubmissionVersions.version, hackathonResults.version),
      ),
    )
    .leftJoin(
      hackathonTracks,
      eq(hackathonTracks.id, hackathonSubmissionVersions.trackId),
    )
    .leftJoin(
      projects,
      eq(projects.sourceSubmissionId, hackathonResults.submissionId),
    )
    .where(
      and(
        eq(hackathonResults.eventId, input.eventId),
        eq(hackathonResults.teamId, input.teamId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const { projectId, projectSlug, projectTitle, projectStatus, ...entry } = row;
  return {
    ...entry,
    project:
      projectId && projectSlug && projectTitle && projectStatus
        ? {
            id: projectId,
            slug: projectSlug,
            title: projectTitle,
            status: projectStatus,
            members: await membersOf(db, projectId),
          }
        : null,
  };
};

/**
 * Make a draft project from an entry (B-PRJ-02), in one batch: the project lands only while the
 * entry is still submitted and the member is still its team's captain, and only the first time, and
 * its team's members follow it. The captain owns it and is listed; everyone else waits to confirm.
 * Returns whether this call made it.
 */
export const createProjectFromEntry = async (
  db: Db,
  input: {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly problem: string;
    readonly description: string;
    readonly stage: ProjectStage;
    readonly repositoryUrl: string;
    readonly demoUrl: string | null;
    readonly marketCode: string;
    readonly submissionId: string;
    readonly teamId: string;
    readonly captainId: string;
  },
): Promise<boolean> => {
  const [created] = await batch(db, [
    db
      .insert(projects)
      .select(
        db
          .select({
            id: bound(input.id, 'id'),
            slug: bound(input.slug, 'slug'),
            title: bound(input.title, 'title'),
            problem: bound(input.problem, 'problem'),
            description: bound(input.description, 'description'),
            stage: bound(input.stage, 'stage'),
            repositoryUrl: bound(input.repositoryUrl, 'repository_url'),
            demoUrl: bound(input.demoUrl, 'demo_url'),
            websiteUrl: sql<string | null>`NULL`.as('website_url'),
            marketCode: bound(input.marketCode, 'market_code'),
            sourceSubmissionId: bound(
              input.submissionId,
              'source_submission_id',
            ),
            status: sql<ProjectStatus>`'draft'`.as('status'),
            isSearchIndexable: sql<boolean>`0`.as('search_indexable'),
            version: sql<number>`1`.as('version'),
            createdAt: sql<Date>`unixepoch()`.as('created_at'),
            updatedAt: sql<Date>`unixepoch()`.as('updated_at'),
          })
          .from(hackathonSubmissions)
          .where(
            and(
              eq(hackathonSubmissions.id, input.submissionId),
              eq(hackathonSubmissions.teamId, input.teamId),
              eq(hackathonSubmissions.status, 'submitted'),
              sql`EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${input.teamId} AND ${hackathonTeamMembers.userId} = ${input.captainId} AND ${hackathonTeamMembers.isCaptain} = 1)`,
            ),
          ),
      )
      .onConflictDoNothing()
      .returning({ id: projects.id }),
    db.insert(projectMembers).select(
      db
        .select({
          projectId: bound(input.id, 'project_id'),
          userId: hackathonTeamMembers.userId,
          role: sql<ProjectMemberRole>`CASE ${hackathonTeamMembers.isCaptain} WHEN 1 THEN 'owner' ELSE 'member' END`.as(
            'role',
          ),
          isListed: sql<boolean>`${hackathonTeamMembers.isCaptain}`.as(
            'listed',
          ),
          createdAt: sql<Date>`unixepoch()`.as('created_at'),
        })
        .from(hackathonTeamMembers)
        .where(
          and(
            eq(hackathonTeamMembers.teamId, input.teamId),
            sql`EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${input.id})`,
          ),
        ),
    ),
  ]);
  return (created as readonly unknown[]).length > 0;
};

/** A project with who is on it and where the entry it came from stands, for a decision about it. */
export const readProjectStanding = async (db: Db, projectId: string) => {
  const [row] = await db
    .select({
      status: projects.status,
      marketCode: projects.marketCode,
      eventId: hackathonSubmissions.eventId,
      entryStatus: hackathonSubmissions.status,
    })
    .from(projects)
    .leftJoin(
      hackathonSubmissions,
      eq(hackathonSubmissions.id, projects.sourceSubmissionId),
    )
    .where(eq(projects.id, projectId))
    .limit(1);
  return row ? { ...row, members: await membersOf(db, projectId) } : null;
};

/** List a member on a project they were added to (B-PRJ-02). Answers whether they are on it. */
export const confirmProjectMember = async (
  db: Db,
  input: { readonly projectId: string; readonly userId: string },
): Promise<boolean> => {
  const rows = await db
    .update(projectMembers)
    .set({ isListed: true })
    .where(
      and(
        eq(projectMembers.projectId, input.projectId),
        eq(projectMembers.userId, input.userId),
      ),
    )
    .returning({ userId: projectMembers.userId });
  return rows.length > 0;
};

/**
 * Publish a draft project (B-PRJ-02), in one statement that holds the rules again: the member still
 * owns it, a teammate confirmed unless there are none, and the entry was not disqualified meanwhile.
 * Returns whether this call published it.
 */
export const publishDraftProject = async (
  db: Db,
  input: { readonly projectId: string; readonly ownerId: string },
): Promise<boolean> => {
  const { projectId, ownerId } = input;
  const teammate = sql`${projectMembers} WHERE ${projectMembers.projectId} = ${projectId} AND ${projectMembers.role} != 'owner'`;
  const rows = await db
    .update(projects)
    .set({
      status: 'published',
      version: sql`${projects.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.status, 'draft'),
        sql`EXISTS (SELECT 1 FROM ${projectMembers} WHERE ${projectMembers.projectId} = ${projectId} AND ${projectMembers.userId} = ${ownerId} AND ${projectMembers.role} = 'owner')`,
        sql`(NOT EXISTS (SELECT 1 FROM ${teammate}) OR EXISTS (SELECT 1 FROM ${teammate} AND ${projectMembers.isListed} = 1))`,
        sql`NOT EXISTS (SELECT 1 FROM ${hackathonSubmissions} WHERE ${hackathonSubmissions.id} = ${projects.sourceSubmissionId} AND ${hackathonSubmissions.status} = 'disqualified')`,
      ),
    )
    .returning({ id: projects.id });
  return rows.length > 0;
};
