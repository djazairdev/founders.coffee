import { and, eq, sql } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { projectMembers, projects } from './schema.js';

/** The project behind a slug as one of its members sees it, or null when they are not on it. */
export const readProjectEditor = async (
  db: Db,
  input: { readonly slug: string; readonly userId: string },
) => {
  const [row] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      marketCode: projects.marketCode,
      status: projects.status,
      stage: projects.stage,
      description: projects.description,
      repositoryUrl: projects.repositoryUrl,
      demoUrl: projects.demoUrl,
      websiteUrl: projects.websiteUrl,
      isSearchIndexable: projects.isSearchIndexable,
      version: projects.version,
      role: projectMembers.role,
      memberCount: sql<number>`(SELECT count(*) FROM ${projectMembers} everyone WHERE everyone.project_id = ${projects.id})`,
    })
    .from(projects)
    .innerJoin(
      projectMembers,
      and(
        eq(projectMembers.projectId, projects.id),
        eq(projectMembers.userId, input.userId),
      ),
    )
    .where(eq(projects.slug, input.slug))
    .limit(1);
  return row ?? null;
};

/**
 * Save an owner's edit (B-PRJ-04) in one statement that holds the rules again: they still own the
 * project and it is still at the version they read. Returns the new version, or null when it was
 * neither, so two owners never overwrite each other unseen.
 */
export const saveProjectEdit = async (
  db: Db,
  input: {
    readonly projectId: string;
    readonly ownerId: string;
    readonly expectedVersion: number;
    readonly fields: {
      readonly description: string;
      readonly stage: (typeof projects.$inferSelect)['stage'];
      readonly repositoryUrl: string | null;
      readonly demoUrl: string | null;
      readonly websiteUrl: string | null;
      readonly isSearchIndexable: boolean;
    };
    readonly now: Date;
  },
): Promise<number | null> => {
  const [row] = await db
    .update(projects)
    .set({
      ...input.fields,
      version: sql`${projects.version} + 1`,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projects.version, input.expectedVersion),
        sql`EXISTS (SELECT 1 FROM ${projectMembers} WHERE ${projectMembers.projectId} = ${input.projectId} AND ${projectMembers.userId} = ${input.ownerId} AND ${projectMembers.role} = 'owner')`,
      ),
    )
    .returning({ version: projects.version });
  return row?.version ?? null;
};

/**
 * Take a member off a project (B-PRJ-04), in one batch. If they were its only owner it passes to
 * whoever joined earliest after them, as it does when an account closes, so the people still on it
 * can keep it up to date. Nothing happens if nobody else is on it. Returns whether they left.
 */
export const leaveProject = async (
  db: Db,
  input: { readonly projectId: string; readonly userId: string },
): Promise<boolean> => {
  const { projectId, userId } = input;
  const [, left] = await batch(db, [
    db
      .update(projectMembers)
      .set({ role: 'owner' })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          sql`EXISTS (SELECT 1 FROM ${projectMembers} own WHERE own.project_id = ${projectId} AND own.user_id = ${userId} AND own.role = 'owner')`,
          sql`NOT EXISTS (SELECT 1 FROM ${projectMembers} other WHERE other.project_id = ${projectId} AND other.role = 'owner' AND other.user_id != ${userId})`,
          sql`${projectMembers.userId} = (SELECT earliest.user_id FROM ${projectMembers} earliest WHERE earliest.project_id = ${projectId} AND earliest.user_id != ${userId} ORDER BY earliest.created_at, earliest.user_id LIMIT 1)`,
        ),
      ),
    db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
          sql`EXISTS (SELECT 1 FROM ${projectMembers} other WHERE other.project_id = ${projectId} AND other.user_id != ${userId})`,
        ),
      )
      .returning({ userId: projectMembers.userId }),
  ]);
  return left.length > 0;
};
