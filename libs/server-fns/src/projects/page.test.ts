import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  listIndexableProjects,
  projectMembers,
  projects as projectRows,
  user,
  type Db,
} from '@founders-coffee/db';

import { hackathons } from '@founders-coffee/domain';

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
} from '../hackathons/results.fixtures.js';
import { publishHackathonResultsResolver } from '../hackathons/results.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { createProjectFromEntryResolver } from './from-entry.js';
import { projectPageResolver } from './page.js';

let db: Db;

const operator = members[3]?.id ?? '';

const created = async () => {
  const setup = await judgingTwoEntries(db);
  await scoreBoth(db, setup);
  await judgingEnded(db, setup.eventId);
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
      actorUserId: operator,
    }),
  );
  return unwrap(
    await createProjectFromEntryResolver(db, null, {
      eventId: setup.eventId,
      userId: captain,
    }),
  );
};

const publish = (projectId: string) =>
  db
    .update(projectRows)
    .set({ status: 'published' })
    .where(eq(projectRows.id, projectId));

describe('a project’s public page (B-PRJ-03, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows a published project with its hackathon, track and AI statement, and only the listed members', async () => {
    const { projectId, slug } = await created();
    await publish(projectId);
    await db
      .update(projectMembers)
      .set({ isListed: true })
      .where(eq(projectMembers.userId, captain));

    const page = unwrap(await projectPageResolver(db, slug));

    expect(page).toMatchObject({
      slug,
      title: 'Ledger',
      stage: expect.any(String),
      marketSlug: expect.any(String),
      timeZone: 'Africa/Algiers',
      isSearchIndexable: false,
      hackathon: { title: expect.any(String), slug: expect.any(String) },
      trackTitle: expect.any(String),
      aiStatement: expect.any(String),
      rank: expect.any(Number),
    });
    expect(page.members.map(({ userId }) => userId)).toEqual([captain]);
    expect(page.members.map(({ userId }) => userId)).not.toContain(member);
    expect(page).not.toHaveProperty('id');
  });

  it('leaves out a listed member whose account is banned', async () => {
    const { projectId, slug } = await created();
    await publish(projectId);
    await db
      .update(projectMembers)
      .set({ isListed: true })
      .where(eq(projectMembers.projectId, projectId));
    await db.update(user).set({ banned: true }).where(eq(user.id, captain));

    const page = unwrap(await projectPageResolver(db, slug));

    expect(page.members.map(({ userId }) => userId)).not.toContain(captain);
    await db.update(user).set({ banned: false }).where(eq(user.id, captain));
  });

  it('says not found for a draft, a hidden project, an unknown slug and a market with hackathons off', async () => {
    const { projectId, slug } = await created();

    expect(codeOf(await projectPageResolver(db, slug))).toBe(
      'project_not_found',
    );
    await db
      .update(projectRows)
      .set({ status: 'hidden' })
      .where(eq(projectRows.id, projectId));
    expect(codeOf(await projectPageResolver(db, slug))).toBe(
      'project_not_found',
    );
    expect(codeOf(await projectPageResolver(db, 'no-such-project'))).toBe(
      'project_not_found',
    );
    await publish(projectId);
    await setHackathons(db, false);
    expect(codeOf(await projectPageResolver(db, slug))).toBe(
      'project_not_found',
    );
  });

  it('offers search engines only the published projects the team turned on', async () => {
    const { projectId, slug } = await created();
    const listed = async () =>
      (await listIndexableProjects(db, ['active'])).map((row) => row.slug);

    await publish(projectId);
    expect(await listed()).not.toContain(slug);
    await db
      .update(projectRows)
      .set({ isSearchIndexable: true })
      .where(eq(projectRows.id, projectId));
    expect(await listed()).toContain(slug);
    await db
      .update(projectRows)
      .set({ status: 'hidden' })
      .where(eq(projectRows.id, projectId));
    expect(await listed()).not.toContain(slug);
  });
});
