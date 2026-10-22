import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';

import type { Db } from './db.js';
import { projectMembers, projects } from './schema.js';

/**
 * The statements that take a closing member off every project (B-PRJ-01), in the order the erasure
 * batch runs them, each re-checking `stillClosing`.
 *
 * A project they were the only owner of passes to the member who joined it earliest after them, so
 * the people still on it can keep it up to date; a project with nobody else on it is deleted. Then
 * their places on projects go.
 */
export const projectErasure = (
  db: Db,
  userId: string,
  stillClosing: SQL,
): BatchItem<'sqlite'>[] => [
  db
    .update(projectMembers)
    .set({ role: 'owner' })
    .where(
      and(
        sql`${projectMembers.projectId} IN (SELECT own.project_id FROM ${projectMembers} own WHERE own.user_id = ${userId} AND own.role = 'owner')`,
        sql`NOT EXISTS (SELECT 1 FROM ${projectMembers} other WHERE other.project_id = ${projectMembers.projectId} AND other.role = 'owner' AND other.user_id != ${userId})`,
        sql`${projectMembers.userId} = (SELECT earliest.user_id FROM ${projectMembers} earliest WHERE earliest.project_id = ${projectMembers.projectId} AND earliest.user_id != ${userId} ORDER BY earliest.created_at, earliest.user_id LIMIT 1)`,
        stillClosing,
      ),
    ),
  db
    .delete(projects)
    .where(
      and(
        sql`EXISTS (SELECT 1 FROM ${projectMembers} WHERE ${projectMembers.projectId} = ${projects.id} AND ${projectMembers.userId} = ${userId})`,
        sql`NOT EXISTS (SELECT 1 FROM ${projectMembers} WHERE ${projectMembers.projectId} = ${projects.id} AND ${projectMembers.userId} != ${userId})`,
        stillClosing,
      ),
    ),
  db
    .delete(projectMembers)
    .where(and(eq(projectMembers.userId, userId), stillClosing)),
];
