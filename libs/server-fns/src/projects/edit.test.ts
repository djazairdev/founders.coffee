import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  projectMembers,
  projects as projectRows,
  type Db,
} from '@founders-coffee/db';
import { hackathons, projects } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import {
  captain,
  codeOf,
  member,
  unwrap,
} from '../hackathons/judging.fixtures.js';
import { setHackathons } from '../hackathons/registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
  type JudgingTwoEntries,
} from '../hackathons/results.fixtures.js';
import { publishHackathonResultsResolver } from '../hackathons/results.js';
import {
  leaveProjectResolver,
  projectEditorResolver,
  updateProjectResolver,
} from './edit.js';
import {
  createProjectFromEntryResolver,
  confirmProjectListingResolver,
  publishProjectResolver,
} from './from-entry.js';
import { projectPageResolver } from './page.js';

let db: Db;

const [, , outsider, operator] = members.map((row) => row.id) as [
  string,
  string,
  string,
  string,
];

const afterResults = async (): Promise<JudgingTwoEntries> => {
  const setup = await judgingTwoEntries(db);
  await scoreBoth(db, setup);
  await judgingEnded(db, setup.eventId);
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
      actorUserId: operator,
    }),
  );
  return setup;
};

const madeProject = async () => {
  const { eventId } = await afterResults();
  const { projectId, slug } = unwrap(
    await createProjectFromEntryResolver(db, null, {
      eventId,
      userId: captain,
    }),
  );
  return { projectId, slug };
};

const publishedProject = async () => {
  const made = await madeProject();
  unwrap(
    await confirmProjectListingResolver(db, {
      projectId: made.projectId,
      userId: member,
    }),
  );
  unwrap(
    await publishProjectResolver(db, null, {
      projectId: made.projectId,
      userId: captain,
    }),
  );
  return made;
};

const editOf = (
  projectId: string,
  expectedVersion: number,
  userId: string,
) => ({
  ...projects.projectEditSchema.parse({
    projectId,
    expectedVersion,
    stage: 'launched',
    description: 'Now live in three shops.',
    websiteUrl: 'https://ledger.example',
    isSearchIndexable: true,
  }),
  userId,
});

const row = async (projectId: string) =>
  (await db.select().from(projectRows).where(eq(projectRows.id, projectId)))[0];

const membersOf = async (projectId: string) =>
  (
    await db
      .select({ userId: projectMembers.userId, role: projectMembers.role })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
  ).sort((a, b) => a.userId.localeCompare(b.userId));

describe('keeping a project up to date (B-PRJ-04, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows an owner and a member the screen, and a stranger nothing', async () => {
    const { slug } = await madeProject();

    expect(
      unwrap(await projectEditorResolver(db, { slug, userId: captain })),
    ).toMatchObject({ role: 'owner', canLeave: true, version: 1 });
    expect(
      unwrap(await projectEditorResolver(db, { slug, userId: member })),
    ).toMatchObject({ role: 'member', canLeave: true });
    expect(
      codeOf(await projectEditorResolver(db, { slug, userId: outsider })),
    ).toBe('project_not_found');
  });

  it('saves an owner’s edit, moves the version and shows the new update date', async () => {
    const { projectId, slug } = await publishedProject();
    await db
      .update(projectRows)
      .set({ updatedAt: new Date('2026-01-01T00:00:00Z') })
      .where(eq(projectRows.id, projectId));

    const saved = unwrap(
      await updateProjectResolver(db, editOf(projectId, 2, captain)),
    );

    expect(saved.version).toBe(3);
    expect(await row(projectId)).toMatchObject({
      stage: 'launched',
      description: 'Now live in three shops.',
      websiteUrl: 'https://ledger.example',
      isSearchIndexable: true,
      version: 3,
    });
    const page = unwrap(await projectPageResolver(db, slug));
    expect(page.stage).toBe('launched');
    expect(page.updatedAt).toBeGreaterThan(Date.UTC(2026, 0, 2));
  });

  it('refuses an edit made from an older version and leaves the saved one', async () => {
    const { projectId } = await publishedProject();
    unwrap(await updateProjectResolver(db, editOf(projectId, 2, captain)));

    const stale = await updateProjectResolver(db, {
      ...editOf(projectId, 2, captain),
      description: 'An older draft.',
    });

    expect(codeOf(stale)).toBe('stale_version');
    expect(await row(projectId)).toMatchObject({
      description: 'Now live in three shops.',
      version: 3,
    });
  });

  it('refuses a member and a stranger, and everyone when hackathons are off', async () => {
    const { projectId, slug } = await publishedProject();

    expect(
      codeOf(await updateProjectResolver(db, editOf(projectId, 2, member))),
    ).toBe('not_project_owner');
    expect(
      codeOf(await updateProjectResolver(db, editOf(projectId, 2, outsider))),
    ).toBe('project_not_found');

    await setHackathons(db, false);
    expect(
      codeOf(await updateProjectResolver(db, editOf(projectId, 2, captain))),
    ).toBe('project_not_found');
    expect(
      codeOf(await projectEditorResolver(db, { slug, userId: captain })),
    ).toBe('project_not_found');
    expect(
      codeOf(await leaveProjectResolver(db, { projectId, userId: member })),
    ).toBe('project_not_found');
  });

  it('takes a member who leaves off the page', async () => {
    const { projectId, slug } = await publishedProject();
    const listed = async () =>
      unwrap(await projectPageResolver(db, slug)).members.map(
        ({ userId }) => userId,
      );
    expect(await listed()).toContain(member);

    unwrap(await leaveProjectResolver(db, { projectId, userId: member }));

    expect(await listed()).not.toContain(member);
    expect(await membersOf(projectId)).not.toContainEqual(
      expect.objectContaining({ userId: member }),
    );
    expect(
      codeOf(await leaveProjectResolver(db, { projectId, userId: member })),
    ).toBe('project_not_found');
  });

  it('passes the project on when its only owner leaves, and keeps the last person on it', async () => {
    const { projectId, slug } = await publishedProject();

    unwrap(await leaveProjectResolver(db, { projectId, userId: captain }));

    expect(await membersOf(projectId)).toEqual([
      { userId: member, role: 'owner' },
    ]);
    expect(
      unwrap(await projectEditorResolver(db, { slug, userId: member })),
    ).toMatchObject({ role: 'owner', canLeave: false });
    expect(
      codeOf(await leaveProjectResolver(db, { projectId, userId: member })),
    ).toBe('project_last_member');
    expect(await membersOf(projectId)).toHaveLength(1);
  });

  it('refuses a stranger who tries to leave, and changes nothing', async () => {
    const { projectId } = await publishedProject();
    const before = await membersOf(projectId);

    expect(
      codeOf(await leaveProjectResolver(db, { projectId, userId: outsider })),
    ).toBe('project_not_found');
    expect(await membersOf(projectId)).toEqual(before);
  });
});
