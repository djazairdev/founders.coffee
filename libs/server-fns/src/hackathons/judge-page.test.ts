import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  eq,
  hackathons as hackathonRows,
  recuseFromEntry,
  type Db,
} from '@founders-coffee/db';

import { setupDb } from '../rsvps/resolver.fixtures.js';
import {
  captain,
  criteriaOf,
  judgeOf,
  submitted,
  toJudging,
  unwrap,
} from './judging.fixtures.js';
import { judgePageResolver } from './judge-page.js';
import { saveJudgeScoresResolver } from './judge-scores.js';
import { setHackathons } from './registration.fixtures.js';

let db: Db;

const pageOf = async (eventId: string, userId: string) =>
  unwrap(await judgePageResolver(db, { eventId, userId }));

describe('the judge page (B-JDG-06, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('marks each entry to score, scored or recused, and counts the judge’s progress', async () => {
    const first = await submitted(db);
    const { eventId } = first;
    const criteria = await criteriaOf(db, eventId);
    await toJudging(db, eventId);
    const judge = await judgeOf(db, eventId);
    const before = await pageOf(eventId, judge.userId);
    expect(before).toMatchObject({
      event: { id: eventId, title: expect.any(String) },
      stage: 'judging',
      isJudge: true,
      entries: [
        {
          submissionId: first.submissionId,
          teamName: 'Byte Club',
          title: 'Ledger',
          trackTitle: 'Payments',
          state: 'to_score',
        },
      ],
      progress: { scored: 0, toScore: 1, recused: 0 },
    });

    unwrap(
      await saveJudgeScoresResolver(db, {
        eventId,
        submissionId: first.submissionId,
        userId: judge.userId,
        scores: [{ criterionId: criteria.impact, value: 6, comment: null }],
      }),
    );
    expect((await pageOf(eventId, judge.userId)).entries[0]?.state).toBe(
      'to_score',
    );
    unwrap(
      await saveJudgeScoresResolver(db, {
        eventId,
        submissionId: first.submissionId,
        userId: judge.userId,
        scores: [{ criterionId: criteria.craft, value: 4, comment: null }],
      }),
    );
    expect((await pageOf(eventId, judge.userId)).progress).toEqual({
      scored: 1,
      toScore: 0,
      recused: 0,
    });

    const other = await judgeOf(db, eventId);
    await recuseFromEntry(db, {
      eventId,
      judgeId: other.judgeId,
      submissionId: first.submissionId,
      reason: 'I mentored this team.',
      actorUserId: other.userId,
      auditId: id('audit'),
    });
    expect(await pageOf(eventId, other.userId)).toMatchObject({
      entries: [{ submissionId: first.submissionId, state: 'recused' }],
      progress: { scored: 0, toScore: 0, recused: 1 },
    });
  });

  it('lists nothing to a member who does not judge, or before judging opens, or after the results', async () => {
    const { eventId } = await submitted(db);
    const judge = await judgeOf(db, eventId);
    const invited = await judgeOf(db, eventId, 'invited');

    expect(await pageOf(eventId, judge.userId)).toMatchObject({
      stage: 'not_started',
      isJudge: true,
      entries: [],
    });
    await toJudging(db, eventId);
    for (const userId of [captain, invited.userId])
      expect(await pageOf(eventId, userId)).toMatchObject({
        stage: 'judging',
        isJudge: false,
        entries: [],
      });
    await db
      .update(hackathonRows)
      .set({ resultsPublishedAt: new Date() })
      .where(eq(hackathonRows.eventId, eventId));
    expect(await pageOf(eventId, judge.userId)).toMatchObject({
      stage: 'closed',
      entries: [],
      progress: { scored: 0, toScore: 0, recused: 0 },
    });
  });
});
