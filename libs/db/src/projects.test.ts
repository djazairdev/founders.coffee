import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { id } from '@founders-coffee/core';

import { eraseClosedAccount } from './account-closure.js';
import { person } from './account-closure.fixtures.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import { newTeam } from './hackathon-teams.fixtures.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import {
  hackathonSubmissions,
  projectMembers,
  projects,
  user,
  type NewProject,
} from './schema.js';

let db: Db;

const newProject = async (values: Partial<NewProject> = {}) => {
  const projectId = id('prj');
  await db.insert(projects).values({
    id: projectId,
    slug: `ledger-${projectId.slice(-8)}`,
    title: 'Ledger for corner shops',
    problem: 'Corner shops in Algiers keep their credit book on paper.',
    stage: 'prototype',
    marketCode: 'DZ',
    ...values,
  });
  return projectId;
};

const on = (
  projectId: string,
  userId: string,
  role: 'owner' | 'member' = 'member',
  createdAt = new Date(),
) => db.insert(projectMembers).values({ projectId, userId, role, createdAt });

const membersOf = (projectId: string) =>
  db
    .select({ userId: projectMembers.userId, role: projectMembers.role })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));

const projectExists = async (projectId: string) =>
  (await db.select().from(projects).where(eq(projects.id, projectId)))
    .length === 1;

const close = async (closing: { id: string; email: string }) => {
  await db
    .update(user)
    .set({ accountState: 'closing', closedAt: new Date() })
    .where(eq(user.id, closing.id));
  await eraseClosedAccount(db, { ...closing, phoneNumber: null });
};

const entry = async () => {
  const row = hackathonEventRow();
  await createHackathon(db, row);
  const submissionId = id('sub');
  await db.insert(hackathonSubmissions).values({
    id: submissionId,
    eventId: row.id,
    teamId: await newTeam(db, row.id, 'Byte Club'),
    title: 'Ledger',
  });
  return submissionId;
};

describe('projects (B-PRJ-01, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('starts a project as an unindexed draft at version 1', async () => {
    const projectId = await newProject();
    const [row] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    expect(row).toMatchObject({
      status: 'draft',
      isSearchIndexable: false,
      version: 1,
      description: '',
      sourceSubmissionId: null,
    });
  });

  it('keeps slugs unique and shaped as lowercase words joined by single hyphens', async () => {
    await newProject({ slug: 'byte-ledger' });
    await expect(newProject({ slug: 'byte-ledger' })).rejects.toThrow();
    for (const slug of [
      'ab',
      'Ledger-app',
      'ledger--app',
      '-ledger',
      'ledger-',
      'ledger app',
    ])
      await expect(newProject({ slug })).rejects.toThrow();
  });

  it('refuses a stage, status or market it does not know, and an empty title', async () => {
    await expect(newProject({ stage: 'scaling' as never })).rejects.toThrow();
    await expect(newProject({ status: 'archived' as never })).rejects.toThrow();
    await expect(newProject({ marketCode: 'XX' })).rejects.toThrow();
    await expect(newProject({ title: '   ' })).rejects.toThrow();
  });

  it('makes one project per entry, and keeps it when the entry goes', async () => {
    const submissionId = await entry();
    const projectId = await newProject({ sourceSubmissionId: submissionId });
    await expect(
      newProject({ sourceSubmissionId: submissionId }),
    ).rejects.toThrow();

    await db
      .delete(hackathonSubmissions)
      .where(eq(hackathonSubmissions.id, submissionId));

    const [row] = await db
      .select({ sourceSubmissionId: projects.sourceSubmissionId })
      .from(projects)
      .where(eq(projects.id, projectId));
    expect(row?.sourceSubmissionId).toBeNull();
  });

  it('lists a member once per project, unlisted until they confirm', async () => {
    const projectId = await newProject();
    const member = await person(db, 'Member');
    await on(projectId, member.id);
    await expect(on(projectId, member.id)).rejects.toThrow();
    const [row] = await db
      .select({ isListed: projectMembers.isListed })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    expect(row?.isListed).toBe(false);
  });

  it('takes a closed account off its projects, passes ownership on, and deletes a project left empty', async () => {
    const closing = await person(db, 'Closing');
    const stays = await person(db, 'Stays');
    const later = await person(db, 'Later');
    const shared = await newProject();
    await on(shared, closing.id, 'owner', new Date('2099-01-01T00:00:00Z'));
    await on(shared, stays.id, 'member', new Date('2099-01-02T00:00:00Z'));
    await on(shared, later.id, 'member', new Date('2099-01-03T00:00:00Z'));
    const alone = await newProject();
    await on(alone, closing.id, 'owner');
    const coOwned = await newProject();
    await on(coOwned, closing.id, 'owner');
    await on(coOwned, later.id, 'owner');
    await on(coOwned, stays.id, 'member');

    await close(closing);

    expect(
      (await membersOf(shared)).sort((a, b) =>
        a.userId.localeCompare(b.userId),
      ),
    ).toEqual(
      [
        { userId: stays.id, role: 'owner' },
        { userId: later.id, role: 'member' },
      ].sort((a, b) => a.userId.localeCompare(b.userId)),
    );
    expect(await projectExists(alone)).toBe(false);
    expect(
      (await membersOf(coOwned)).find((row) => row.userId === stays.id)?.role,
    ).toBe('member');
  });
});
