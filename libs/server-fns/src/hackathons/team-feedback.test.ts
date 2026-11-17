import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  and,
  eq,
  hackathonJudges,
  hackathonRegistrations,
  hackathonScores,
  hackathonTeamMembers,
  recuseFromEntry,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { captain, judgeOf, member, unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
  scored,
  type JudgingTwoEntries,
} from './results.fixtures.js';
import { publishHackathonResultsResolver } from './results.js';
import { teamPageResolver } from './team-page.js';

let db: Db;

const [, , rivalMember, stranger] = members.map((row) => row.id) as [
  string,
  string,
  string,
  string,
];
const COMMENT = 'A shop could use this tomorrow.';

const publish = async (eventId: string) => {
  await judgingEnded(db, eventId);
  unwrap(
    await publishHackathonResultsResolver(db, null, {
      ...hackathons.publishResultsSchema.parse({ eventId }),
      actorUserId: members[3]?.id ?? '',
    }),
  );
};

const commentOn = (setup: JudgingTwoEntries, submissionId: string) =>
  db
    .update(hackathonScores)
    .set({ comment: COMMENT })
    .where(
      and(
        eq(hackathonScores.submissionId, submissionId),
        eq(hackathonScores.judgeId, setup.judge.judgeId),
        eq(hackathonScores.criterionId, setup.criteria.impact),
      ),
    );

const joinRival = async (setup: JudgingTwoEntries) => {
  const { eventId, rival } = setup;
  await db.insert(hackathonRegistrations).values({
    id: id('reg'),
    eventId,
    userId: rivalMember,
    status: 'registered',
    attendanceMode: 'in_person',
  });
  await db.insert(hackathonTeamMembers).values({
    eventId,
    teamId: rival.teamId,
    userId: rivalMember,
    isCaptain: true,
  });
};

const feedbackOf = async (eventId: string, userId: string) =>
  unwrap(await teamPageResolver(db, { eventId, userId })).feedback;

describe('a team reads its judges’ feedback (B-JDG-12, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows nothing until the results are published', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await commentOn(setup, setup.submissionId);

    expect(await feedbackOf(setup.eventId, captain)).toBeNull();
    expect(await feedbackOf(setup.eventId, member)).toBeNull();
  });

  it('shows every member of the team its own scores and comments, without naming the judge', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await commentOn(setup, setup.submissionId);
    await publish(setup.eventId);

    const expected = {
      title: 'Ledger',
      judges: [
        {
          number: 1,
          scores: expect.arrayContaining([
            expect.objectContaining({
              criterionId: setup.criteria.impact,
              value: 8,
              comment: COMMENT,
            }),
            expect.objectContaining({
              criterionId: setup.criteria.craft,
              value: 4,
              comment: null,
            }),
          ]),
        },
      ],
    };
    expect(await feedbackOf(setup.eventId, captain)).toEqual(expected);
    expect(await feedbackOf(setup.eventId, member)).toEqual(expected);

    const [judge] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, setup.judge.userId));
    const read = JSON.stringify(
      unwrap(
        await teamPageResolver(db, {
          eventId: setup.eventId,
          userId: captain,
        }),
      ).feedback,
    );
    expect(read).not.toContain(setup.judge.judgeId);
    expect(read).not.toContain(setup.judge.userId);
    expect(read).not.toContain(judge?.name ?? setup.judge.userId);
  });

  it('never shows another team’s feedback, and shows a stranger none', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await commentOn(setup, setup.submissionId);
    await joinRival(setup);
    await publish(setup.eventId);

    const rivals = await feedbackOf(setup.eventId, rivalMember);
    expect(rivals?.title).toBe('Souk');
    expect(JSON.stringify(rivals)).not.toContain(COMMENT);
    expect(await feedbackOf(setup.eventId, stranger)).toBeNull();
  });

  it('leaves out a judge who recused from the entry or was removed, and renumbers the rest', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, criteria } = setup;
    await scoreBoth(db, setup);
    const recused = await judgeOf(db, eventId);
    const removed = await judgeOf(db, eventId);
    await scored(db, eventId, recused.judgeId, submissionId, {
      [criteria.impact]: 2,
      [criteria.craft]: 2,
    });
    await scored(db, eventId, recused.judgeId, setup.rival.submissionId, {
      [criteria.impact]: 2,
      [criteria.craft]: 2,
    });
    await scored(db, eventId, removed.judgeId, submissionId, {
      [criteria.impact]: 1,
      [criteria.craft]: 1,
    });
    await recuseFromEntry(db, {
      eventId,
      judgeId: recused.judgeId,
      submissionId,
      reason: 'I mentored this team.',
      actorUserId: recused.userId,
      auditId: id('aud'),
    });
    await db
      .update(hackathonJudges)
      .set({ status: 'removed' })
      .where(eq(hackathonJudges.id, removed.judgeId));
    await publish(eventId);

    const feedback = await feedbackOf(eventId, captain);
    expect(feedback?.judges.map((judge) => judge.number)).toEqual([1]);
    expect(feedback?.judges[0]?.scores.map((score) => score.value)).toEqual(
      expect.arrayContaining([8, 4]),
    );
  });
});
