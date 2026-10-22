import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  eq,
  hackathonCriteria,
  hackathons as hackathonRows,
  hackathonScores,
  listJudgeScores,
  recuseFromEntry,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { setupDb } from '../rsvps/resolver.fixtures.js';
import {
  codeOf,
  judgeOf,
  submitted,
  toJudging,
  unwrap,
} from './judging.fixtures.js';
import { saveJudgeScoresResolver } from './judge-scores.js';
import { setHackathons } from './registration.fixtures.js';

let db: Db;

const criteriaOf = async (eventId: string) => {
  const [impact, craft] = [id('crt'), id('crt')];
  await db.insert(hackathonCriteria).values([
    {
      id: impact,
      eventId,
      name: 'Impact',
      description: 'Who it helps.',
      weight: 60,
      scale: 10,
      position: 0,
    },
    {
      id: craft,
      eventId,
      name: 'Craft',
      description: 'How well it is built.',
      weight: 40,
      scale: 5,
      position: 1,
    },
  ]);
  return { impact, craft };
};

const judging = async () => {
  const { eventId, submissionId } = await submitted(db);
  const criteria = await criteriaOf(eventId);
  await toJudging(db, eventId);
  const judge = await judgeOf(db, eventId);
  return { eventId, submissionId, criteria, judge };
};

const scoreAs = (
  userId: string,
  input: { eventId: string; submissionId: string; scores: object[] },
) =>
  saveJudgeScoresResolver(db, {
    ...hackathons.judgeScoresSchema.parse(input),
    userId,
  });

const savedBy = (judgeId: string, submissionId: string) =>
  listJudgeScores(db, { judgeId, submissionId });

describe('judges score entries (B-JDG-05, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('saves a judge’s scores and replaces them when the judge saves again', async () => {
    const { eventId, submissionId, criteria, judge } = await judging();

    expect(
      unwrap(
        await scoreAs(judge.userId, {
          eventId,
          submissionId,
          scores: [
            { criterionId: criteria.impact, value: 8, comment: ' Useful. ' },
            { criterionId: criteria.craft, value: 3 },
          ],
        }),
      ),
    ).toEqual({ saved: 2 });
    unwrap(
      await scoreAs(judge.userId, {
        eventId,
        submissionId,
        scores: [{ criterionId: criteria.craft, value: 5, comment: '' }],
      }),
    );

    expect(await savedBy(judge.judgeId, submissionId)).toEqual(
      expect.arrayContaining([
        { criterionId: criteria.impact, value: 8, comment: 'Useful.' },
        { criterionId: criteria.craft, value: 5, comment: null },
      ]),
    );
  });

  it('refuses a score above its criterion’s scale, or for another hackathon’s criterion, and writes nothing', async () => {
    const { eventId, submissionId, criteria, judge } = await judging();
    const other = await submitted(db);
    const elsewhere = await criteriaOf(other.eventId);

    expect(
      codeOf(
        await scoreAs(judge.userId, {
          eventId,
          submissionId,
          scores: [
            { criterionId: criteria.impact, value: 9 },
            { criterionId: criteria.craft, value: 6 },
          ],
        }),
      ),
    ).toBe('score_out_of_range');
    expect(
      codeOf(
        await scoreAs(judge.userId, {
          eventId,
          submissionId,
          scores: [{ criterionId: elsewhere.impact, value: 4 }],
        }),
      ),
    ).toBe('criterion_not_found');
    expect(await savedBy(judge.judgeId, submissionId)).toEqual([]);
  });

  it('refuses a judge who recused from the entry, and anyone who does not judge', async () => {
    const { eventId, submissionId, criteria, judge } = await judging();
    const invited = await judgeOf(db, eventId, 'invited');
    await recuseFromEntry(db, {
      eventId,
      judgeId: judge.judgeId,
      submissionId,
      reason: 'I mentored this team.',
      actorUserId: judge.userId,
      auditId: id('audit'),
    });
    const scores = [{ criterionId: criteria.impact, value: 7 }];

    expect(
      codeOf(await scoreAs(judge.userId, { eventId, submissionId, scores })),
    ).toBe('judge_recused');
    expect(
      codeOf(await scoreAs(invited.userId, { eventId, submissionId, scores })),
    ).toBe('not_judge');
    expect(
      await db
        .select()
        .from(hackathonScores)
        .where(eq(hackathonScores.submissionId, submissionId)),
    ).toEqual([]);
  });

  it('refuses scores before judging opens and once the results are published', async () => {
    const { eventId, submissionId } = await submitted(db);
    const criteria = await criteriaOf(eventId);
    const judge = await judgeOf(db, eventId);
    const scores = [{ criterionId: criteria.impact, value: 7 }];

    expect(
      codeOf(await scoreAs(judge.userId, { eventId, submissionId, scores })),
    ).toBe('judging_not_started');
    await toJudging(db, eventId);
    await db
      .update(hackathonRows)
      .set({ resultsPublishedAt: new Date() })
      .where(eq(hackathonRows.eventId, eventId));
    expect(
      codeOf(await scoreAs(judge.userId, { eventId, submissionId, scores })),
    ).toBe('judging_closed');
    expect(await savedBy(judge.judgeId, submissionId)).toEqual([]);
  });

  it('writes nothing when the rule passes but the hackathon moved on before the batch', async () => {
    const { eventId, submissionId, criteria, judge } = await judging();
    await db
      .update(hackathonRows)
      .set({ judgingEndsAt: new Date(Date.now() - 1000) })
      .where(eq(hackathonRows.eventId, eventId));

    const refused = await saveJudgeScoresResolver(
      db,
      {
        eventId,
        submissionId,
        userId: judge.userId,
        scores: [{ criterionId: criteria.impact, value: 7, comment: null }],
      },
      Date.now() - 60_000,
    );

    expect(codeOf(refused)).toBe('judging_closed');
    expect(await savedBy(judge.judgeId, submissionId)).toEqual([]);
  });
});
