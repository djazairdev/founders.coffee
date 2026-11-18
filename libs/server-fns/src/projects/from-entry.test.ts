import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  hackathonSubmissions,
  projectMembers,
  projects as projectRows,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

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
import { teamPageResolver } from '../hackathons/team-page.js';
import {
  confirmProjectListingResolver,
  createProjectFromEntryResolver,
  publishProjectResolver,
} from './from-entry.js';

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

const create = (eventId: string, userId: string) =>
  createProjectFromEntryResolver(db, null, { eventId, userId });
const confirm = (projectId: string, userId: string) =>
  confirmProjectListingResolver(db, { projectId, userId });
const publish = (projectId: string, userId: string) =>
  publishProjectResolver(db, null, { projectId, userId });

const row = async (projectId: string) =>
  (await db.select().from(projectRows).where(eq(projectRows.id, projectId)))[0];

const membersOf = async (projectId: string) =>
  (
    await db
      .select({
        userId: projectMembers.userId,
        role: projectMembers.role,
        isListed: projectMembers.isListed,
      })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
  ).sort((a, b) => a.userId.localeCompare(b.userId));

const viewOf = async (eventId: string, userId: string) =>
  unwrap(await teamPageResolver(db, { eventId, userId })).project;

describe('turning an entry into a project (B-PRJ-02, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('copies the frozen entry into a draft the captain owns, the rest waiting to confirm', async () => {
    const { eventId, submissionId } = await afterResults();

    const { projectId, slug } = unwrap(await create(eventId, captain));

    expect(slug).toMatch(/^ledger-[0-9a-f]{8}$/u);
    expect(await row(projectId)).toMatchObject({
      title: 'Ledger',
      stage: 'prototype',
      status: 'draft',
      marketCode: 'DZ',
      sourceSubmissionId: submissionId,
      repositoryUrl: 'https://github.com/byte-club/ledger',
      isSearchIndexable: false,
      version: 1,
    });
    expect((await row(projectId))?.problem.length).toBeGreaterThan(0);
    expect(await membersOf(projectId)).toEqual(
      [
        { userId: captain, role: 'owner', isListed: true },
        { userId: member, role: 'member', isListed: false },
      ].sort((a, b) => a.userId.localeCompare(b.userId)),
    );
  });

  it('refuses before the results, a member who is not the captain, a stranger and a second project', async () => {
    const before = await judgingTwoEntries(db);
    expect(codeOf(await create(before.eventId, captain))).toBe(
      'project_not_available',
    );

    const { eventId } = await afterResults();
    expect(codeOf(await create(eventId, member))).toBe('not_team_captain');
    expect(codeOf(await create(eventId, outsider))).toBe('not_team_captain');
    unwrap(await create(eventId, captain));
    expect(codeOf(await create(eventId, captain))).toBe('project_exists');
  });

  it('refuses a disqualified entry, and publishing one disqualified after its draft was made', async () => {
    const { eventId, submissionId } = await afterResults();
    const disqualify = () =>
      db
        .update(hackathonSubmissions)
        .set({ status: 'disqualified' })
        .where(eq(hackathonSubmissions.id, submissionId));
    const { projectId } = unwrap(await create(eventId, captain));
    unwrap(await confirm(projectId, member));
    await disqualify();

    expect(codeOf(await publish(projectId, captain))).toBe(
      'project_not_available',
    );
    expect((await row(projectId))?.status).toBe('draft');
    await db.delete(projectRows).where(eq(projectRows.id, projectId));
    expect(codeOf(await create(eventId, captain))).toBe(
      'project_not_available',
    );
    expect(await viewOf(eventId, captain)).toBeNull();
  });

  it('publishes for the captain once a teammate confirmed, and only then', async () => {
    const { eventId } = await afterResults();
    const { projectId } = unwrap(await create(eventId, captain));

    expect(codeOf(await publish(projectId, captain))).toBe(
      'project_needs_confirmation',
    );
    expect(codeOf(await confirm(projectId, outsider))).toBe(
      'project_not_found',
    );
    expect(codeOf(await publish(projectId, outsider))).toBe(
      'project_not_found',
    );
    unwrap(await confirm(projectId, member));
    expect(codeOf(await publish(projectId, member))).toBe('not_project_owner');

    unwrap(await publish(projectId, captain));

    expect(await row(projectId)).toMatchObject({
      status: 'published',
      version: 2,
    });
    expect(codeOf(await publish(projectId, captain))).toBe(
      'invalid_project_transition',
    );
  });

  it('shows the team where the project stands', async () => {
    const { eventId } = await afterResults();

    expect(await viewOf(eventId, captain)).toEqual({ stage: 'can_create' });
    expect(await viewOf(eventId, member)).toBeNull();
    expect(await viewOf(eventId, outsider)).toBeNull();

    const { projectId, slug } = unwrap(await create(eventId, captain));
    const made = {
      stage: 'made',
      id: projectId,
      slug,
      title: 'Ledger',
      status: 'draft',
      teammates: 1,
    };
    expect(await viewOf(eventId, captain)).toEqual({
      ...made,
      isOwner: true,
      isOnProject: true,
      isListed: true,
      confirmedTeammates: 0,
      canPublish: false,
    });
    expect(await viewOf(eventId, member)).toEqual({
      ...made,
      isOwner: false,
      isOnProject: true,
      isListed: false,
      confirmedTeammates: 0,
      canPublish: false,
    });

    unwrap(await confirm(projectId, member));
    expect(await viewOf(eventId, captain)).toMatchObject({
      confirmedTeammates: 1,
      canPublish: true,
    });
  });
});
