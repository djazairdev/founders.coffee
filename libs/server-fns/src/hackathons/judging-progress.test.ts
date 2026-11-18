import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  and,
  eq,
  hackathons as hackathonRows,
  recuseFromEntry,
  scheduledNotifications,
  type Db,
} from '@founders-coffee/db';

import { setupDb } from '../rsvps/resolver.fixtures.js';
import { codeOf, judgeOf, unwrap } from './judging.fixtures.js';
import {
  judgingProgressResolver,
  remindJudgesResolver,
} from './judging-progress.js';
import { setHackathons } from './registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
  scored,
} from './results.fixtures.js';

let db: Db;

const remindersOf = async (eventId: string) =>
  (
    await db
      .select({ userId: scheduledNotifications.userId })
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.eventId, eventId),
          eq(scheduledNotifications.templateKey, 'hackathon_judge_reminder'),
        ),
      )
  ).map((row) => row.userId);

describe('organisers follow judging and remind judges (B-JDG-08, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('counts each accepted judge’s submissions as scored, to score and recused', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, rival, criteria, judge } = setup;
    await scored(db, eventId, judge.judgeId, submissionId, {
      [criteria.impact]: 8,
      [criteria.craft]: 4,
    });
    await scored(db, eventId, judge.judgeId, rival.submissionId, {
      [criteria.impact]: 8,
    });
    const recused = await judgeOf(db, eventId);
    await recuseFromEntry(db, {
      eventId,
      judgeId: recused.judgeId,
      submissionId,
      reason: 'I mentored this team.',
      actorUserId: recused.userId,
      auditId: id('aud'),
    });
    await judgeOf(db, eventId, 'invited');

    const view = unwrap(await judgingProgressResolver(db, eventId));

    expect(view.stage).toBe('judging');
    expect(view.entries).toBe(2);
    expect(view.judges).toHaveLength(2);
    expect(
      view.judges.find((row) => row.judgeId === judge.judgeId)?.progress,
    ).toEqual({ scored: 1, toScore: 1, recused: 0 });
    expect(
      view.judges.find((row) => row.judgeId === recused.judgeId)?.progress,
    ).toEqual({ scored: 0, toScore: 1, recused: 1 });
  });

  it('reminds only judges with scores missing, and not again within a day', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, judge } = setup;
    await scoreBoth(db, setup);
    const late = await judgeOf(db, eventId);

    expect(unwrap(await remindJudgesResolver(db, eventId))).toEqual({
      reminded: 1,
      alreadyReminded: 0,
    });
    expect(await remindersOf(eventId)).toEqual([late.userId]);
    expect(await remindersOf(eventId)).not.toContain(judge.userId);

    expect(unwrap(await remindJudgesResolver(db, eventId))).toEqual({
      reminded: 0,
      alreadyReminded: 1,
    });
    expect(await remindersOf(eventId)).toHaveLength(1);

    await db
      .update(hackathonRows)
      .set({ judgingEndsAt: new Date(Date.now() + 10 * 24 * 3_600_000) })
      .where(eq(hackathonRows.eventId, eventId));
    expect(
      unwrap(
        await remindJudgesResolver(db, eventId, Date.now() + 25 * 3_600_000),
      ).reminded,
    ).toBe(1);
    expect(await remindersOf(eventId)).toEqual([late.userId, late.userId]);
  });

  it('refuses a reminder outside judging', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId } = setup;

    await judgingEnded(db, eventId);
    expect(codeOf(await remindJudgesResolver(db, eventId))).toBe(
      'judging_closed',
    );

    await db
      .update(hackathonRows)
      .set({ resultsPublishedAt: new Date() })
      .where(eq(hackathonRows.eventId, eventId));
    expect(codeOf(await remindJudgesResolver(db, eventId))).toBe(
      'judging_closed',
    );
    expect(await remindersOf(eventId)).toEqual([]);
  });

  it('sends the judge to their list, in their language', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId } = setup;
    await judgeOf(db, eventId);
    unwrap(await remindJudgesResolver(db, eventId));

    const [row] = await db
      .select({ payload: scheduledNotifications.payload })
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.eventId, eventId),
          eq(scheduledNotifications.templateKey, 'hackathon_judge_reminder'),
        ),
      );
    expect((row?.payload as { pushUrl: string }).pushUrl).toContain(
      `/hackathon/${eventId}/judge`,
    );
  });
});
