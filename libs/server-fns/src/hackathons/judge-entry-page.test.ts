import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  eq,
  hackathons as hackathonRows,
  hackathonSubmissions,
  recuseFromEntry,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import {
  criteriaOf,
  judgeOf,
  submitted,
  toJudging,
  unwrap,
} from './judging.fixtures.js';
import { saveJudgeScoresResolver } from './judge-scores.js';
import { judgeEntryPageResolver } from './judge-page.js';
import { setHackathons } from './registration.fixtures.js';

let db: Db;

const outsider = members[2]?.id ?? '';

const judging = async () => {
  const { eventId, submissionId } = await submitted(db);
  const criteria = await criteriaOf(db, eventId);
  await toJudging(db, eventId);
  const judge = await judgeOf(db, eventId);
  return { eventId, submissionId, criteria, judge };
};

const pageOf = async (eventId: string, submissionId: string, userId: string) =>
  unwrap(await judgeEntryPageResolver(db, { eventId, submissionId, userId }));

const NOTHING = { entry: null, criteria: [], scores: [] };

describe('one submission as a judge scores it (B-JDG-07, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('gives an accepted judge the submission, the criteria and the scores they saved', async () => {
    const { eventId, submissionId, criteria, judge } = await judging();
    unwrap(
      await saveJudgeScoresResolver(db, {
        ...hackathons.judgeScoresSchema.parse({
          eventId,
          submissionId,
          scores: [
            { criterionId: criteria.impact, value: 8, comment: 'Useful.' },
          ],
        }),
        userId: judge.userId,
      }),
    );

    const view = await pageOf(eventId, submissionId, judge.userId);

    expect(view).toMatchObject({
      stage: 'judging',
      isJudge: true,
      isRecused: false,
      entry: {
        submissionId,
        teamName: 'Byte Club',
        title: 'Ledger',
        repositoryUrl: 'https://github.com/byte-club/ledger',
      },
      scores: [{ criterionId: criteria.impact, value: 8, comment: 'Useful.' }],
    });
    expect(view.criteria.map((criterion) => criterion.id)).toEqual(
      expect.arrayContaining([criteria.impact, criteria.craft]),
    );
    expect(
      view.criteria.find((criterion) => criterion.id === criteria.craft),
    ).toMatchObject({ scale: 5 });
  });

  it('gives a judge who recused only that they recused', async () => {
    const { eventId, submissionId, judge } = await judging();
    await recuseFromEntry(db, {
      eventId,
      judgeId: judge.judgeId,
      submissionId,
      reason: 'I mentored this team.',
      actorUserId: judge.userId,
      auditId: id('audit'),
    });

    expect(await pageOf(eventId, submissionId, judge.userId)).toMatchObject({
      isJudge: true,
      isRecused: true,
      ...NOTHING,
    });
  });

  it('gives no submission to anyone who does not judge, or to a judge who has not accepted', async () => {
    const { eventId, submissionId } = await judging();
    const invited = await judgeOf(db, eventId, 'invited');

    for (const userId of [outsider, invited.userId])
      expect(await pageOf(eventId, submissionId, userId)).toMatchObject({
        isJudge: false,
        isRecused: false,
        ...NOTHING,
      });
  });

  it('gives no submission before judging opens or once the results are out', async () => {
    const { eventId, submissionId } = await submitted(db);
    const judge = await judgeOf(db, eventId);

    expect(await pageOf(eventId, submissionId, judge.userId)).toMatchObject({
      stage: 'not_started',
      isJudge: true,
      ...NOTHING,
    });
    await toJudging(db, eventId);
    await db
      .update(hackathonRows)
      .set({ resultsPublishedAt: new Date() })
      .where(eq(hackathonRows.eventId, eventId));
    expect(await pageOf(eventId, submissionId, judge.userId)).toMatchObject({
      stage: 'closed',
      ...NOTHING,
    });
  });

  it('finds no submission that is disqualified or belongs to another hackathon', async () => {
    const { eventId, submissionId, judge } = await judging();
    const other = await submitted(db);

    expect(
      (await pageOf(eventId, other.submissionId, judge.userId)).entry,
    ).toBeNull();
    await db
      .update(hackathonSubmissions)
      .set({ status: 'disqualified' })
      .where(eq(hackathonSubmissions.id, submissionId));
    expect(
      (await pageOf(eventId, submissionId, judge.userId)).entry,
    ).toBeNull();
  });
});
