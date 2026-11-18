import { beforeEach, describe, expect, it } from 'vitest';

import {
  and,
  eq,
  hackathonResults,
  projectMembers,
  projects,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { captain, member, unwrap } from '../hackathons/judging.fixtures.js';
import { setHackathons } from '../hackathons/registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
} from '../hackathons/results.fixtures.js';
import { publishHackathonResultsResolver } from '../hackathons/results.js';
import {
  confirmProjectListingResolver,
  createProjectFromEntryResolver,
  publishProjectResolver,
} from '../projects/from-entry.js';
import { leaveProjectResolver } from '../projects/edit.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { readPublicProfile } from './resolver.js';

let db: Db;

const operator = members[3]?.id ?? '';

const draftProject = async () => {
  const setup = await judgingTwoEntries(db);
  await scoreBoth(db, setup);
  await judgingEnded(db, setup.eventId);
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId: setup.eventId }),
      actorUserId: operator,
    }),
  );
  const { projectId } = unwrap(
    await createProjectFromEntryResolver(db, null, {
      eventId: setup.eventId,
      userId: captain,
    }),
  );
  return projectId;
};

const publish = async (projectId: string) => {
  unwrap(
    await confirmProjectListingResolver(db, { projectId, userId: member }),
  );
  unwrap(
    await publishProjectResolver(db, null, { projectId, userId: captain }),
  );
};

const projectsOn = async (userId: string) =>
  unwrap(await readPublicProfile(db, userId)).projects;

const slugOf = async (projectId: string) => {
  const [row] = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(eq(projects.id, projectId));
  return row?.slug ?? '';
};

const shownOn = async (userId: string, projectId: string) => {
  const slug = await slugOf(projectId);
  return (await projectsOn(userId)).find((project) => project.slug === slug);
};

describe('projects on a public profile (B-PRJ-05, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows nobody a draft, and a published project only to those who confirmed', async () => {
    const projectId = await draftProject();
    unwrap(
      await confirmProjectListingResolver(db, { projectId, userId: member }),
    );
    expect(await shownOn(captain, projectId)).toBeUndefined();

    unwrap(
      await publishProjectResolver(db, null, { projectId, userId: captain }),
    );

    expect(await shownOn(captain, projectId)).toMatchObject({
      stage: expect.any(String),
      title: expect.any(String),
      hackathonTitle: expect.any(String),
    });
    expect(await shownOn(member, projectId)).toBeDefined();
    await db
      .update(projectMembers)
      .set({ isListed: false })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, member),
        ),
      );
    expect(await shownOn(member, projectId)).toBeUndefined();
  });

  it('says where the results placed it, and nothing after a disqualification', async () => {
    const projectId = await draftProject();
    await publish(projectId);
    const [row] = await db
      .select({ submissionId: projects.sourceSubmissionId })
      .from(projects)
      .where(eq(projects.id, projectId));
    const [frozen] = await db
      .select({ rank: hackathonResults.rank })
      .from(hackathonResults)
      .where(eq(hackathonResults.submissionId, row?.submissionId ?? ''));

    expect((await shownOn(captain, projectId))?.rank).toBe(frozen?.rank);

    await db
      .update(hackathonResults)
      .set({ disqualifiedAt: new Date() })
      .where(eq(hackathonResults.submissionId, row?.submissionId ?? ''));
    expect(await shownOn(captain, projectId)).toMatchObject({
      rank: null,
      trackRank: null,
    });
  });

  it('lists the newest first', async () => {
    const projectId = await draftProject();
    await publish(projectId);
    const [template] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    if (!template) throw new Error('The project was not made');
    const later = 'prj_0123456789abcdef0123456789abcdef';
    await db.insert(projects).values({
      ...template,
      id: later,
      slug: 'a-later-project',
      title: 'A later project',
      sourceSubmissionId: null,
      createdAt: new Date(template.createdAt.getTime() + 86_400_000),
    });
    await db.insert(projectMembers).values({
      projectId: later,
      userId: captain,
      role: 'owner',
      isListed: true,
    });

    expect((await projectsOn(captain))[0]).toMatchObject({
      slug: 'a-later-project',
      hackathonTitle: null,
      rank: null,
    });
  });

  it('drops a project the member left, and any where hackathons were turned off', async () => {
    const projectId = await draftProject();
    await publish(projectId);
    expect(await shownOn(member, projectId)).toBeDefined();

    unwrap(await leaveProjectResolver(db, { projectId, userId: member }));
    expect(await shownOn(member, projectId)).toBeUndefined();

    expect(await shownOn(captain, projectId)).toBeDefined();
    await setHackathons(db, false);
    expect(await shownOn(captain, projectId)).toBeUndefined();
  });
});
