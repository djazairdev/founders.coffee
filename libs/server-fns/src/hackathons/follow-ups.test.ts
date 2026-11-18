import { beforeEach, describe, expect, it } from 'vitest';

import {
  and,
  eq,
  hackathons as hackathonRows,
  scheduledNotifications,
  type Db,
} from '@founders-coffee/db';
import { enableOperations } from '@founders-coffee/db/operations-fixtures';
import { hackathons, operations } from '@founders-coffee/domain';

import { decideReportResolver } from '../admin/hackathon-reports.js';
import { enqueueResultsNoticeBatch } from '../notifications/hackathon-results-notices.js';
import {
  readFeedback,
  submitFeedbackResolver,
} from '../operations/feedback.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { captain, codeOf, member, unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import { reportHackathonTargetResolver } from './reports.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
  type JudgingTwoEntries,
} from './results.fixtures.js';
import { publishHackathonResultsResolver } from './results.js';

let db: Db;

const [, , outsider, operator] = members.map((row) => row.id) as [
  string,
  string,
  string,
  string,
];

const DAY_MS = 24 * 60 * 60 * 1000;

const published = async (): Promise<JudgingTwoEntries> => {
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

const writeNotices = (eventId: string) =>
  enqueueResultsNoticeBatch(db, { eventId, afterUserId: null, limit: 50 });

const followUpsOf = async (
  eventId: string,
  templateKey: 'hackathon_followup_week' | 'hackathon_followup_month',
) =>
  db
    .select({
      userId: scheduledNotifications.userId,
      status: scheduledNotifications.status,
      sendAt: scheduledNotifications.sendAt,
      payload: scheduledNotifications.payload,
    })
    .from(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.eventId, eventId),
        eq(scheduledNotifications.templateKey, templateKey),
      ),
    );

const answer = (eventId: string, userId: string) =>
  submitFeedbackResolver(db, {
    userId,
    input: { eventId, rating: 'valuable', wouldReturn: true },
  });

describe('follow-ups after a hackathon’s results (B-OPS-03, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
    await enableOperations(db);
  });

  it('schedules both for a member of a team in the results, once, a week and a month out', async () => {
    const { eventId, judge } = await published();
    const [found] = await db
      .select({ at: hackathonRows.resultsPublishedAt })
      .from(hackathonRows)
      .where(eq(hackathonRows.eventId, eventId));
    const publishedAt = found?.at?.getTime() ?? 0;

    await writeNotices(eventId);
    await writeNotices(eventId);

    const week = await followUpsOf(eventId, 'hackathon_followup_week');
    const month = await followUpsOf(eventId, 'hackathon_followup_month');
    expect(week.map((row) => row.userId).sort()).toEqual(
      [captain, member].sort(),
    );
    expect(month.map((row) => row.userId).sort()).toEqual(
      [captain, member].sort(),
    );
    expect(week[0]?.sendAt.getTime()).toBe(
      publishedAt + operations.FOLLOW_UP_WEEK_AFTER_RESULTS_MS,
    );
    expect(month[0]?.sendAt.getTime()).toBe(
      publishedAt + operations.FOLLOW_UP_MONTH_AFTER_RESULTS_MS,
    );
    expect(week.map((row) => row.userId)).not.toContain(judge.userId);
    const link = (rows: typeof week) =>
      (rows[0]?.payload as { pushUrl: string }).pushUrl;
    expect(link(week)).toContain(`/feedback/${eventId}`);
    expect(link(month)).toContain(`/hackathon/${eventId}/team`);
  });

  it('skips the question where the market collects no feedback, and still asks about building', async () => {
    const { eventId } = await published();
    await enableOperations(db, false);

    await writeNotices(eventId);

    expect(await followUpsOf(eventId, 'hackathon_followup_week')).toEqual([]);
    expect(await followUpsOf(eventId, 'hackathon_followup_month')).toHaveLength(
      2,
    );
  });

  it('lets a team member answer, once they can, and nobody else', async () => {
    const { eventId } = await published();

    expect(
      unwrap(await readFeedback(db, { eventId, userId: captain })),
    ).toMatchObject({ status: 'ready', isHackathon: true });
    unwrap(await answer(eventId, captain));
    expect(
      unwrap(await readFeedback(db, { eventId, userId: captain })).feedback,
    ).toMatchObject({ valueRating: 'valuable', wouldReturn: true });

    expect(codeOf(await readFeedback(db, { eventId, userId: outsider }))).toBe(
      'feedback_not_attended',
    );
    expect(codeOf(await answer(eventId, outsider))).toBe(
      'feedback_not_attended',
    );
  });

  it('asks nothing before the results, and closes fourteen days after them', async () => {
    const before = await judgingTwoEntries(db);
    expect(codeOf(await answer(before.eventId, captain))).toBe(
      'feedback_not_invited',
    );

    const { eventId } = await published();
    await db
      .update(hackathonRows)
      .set({ resultsPublishedAt: new Date(Date.now() - 15 * DAY_MS) })
      .where(eq(hackathonRows.eventId, eventId));

    expect(codeOf(await answer(eventId, captain))).toBe(
      'feedback_window_closed',
    );
  });

  it('withdraws the follow-ups from a team disqualified after the results, and stops its answers', async () => {
    const setup = await published();
    const { eventId, submissionId } = setup;
    await writeNotices(eventId);
    unwrap(
      await reportHackathonTargetResolver(db, {
        eventId,
        targetType: 'submission',
        targetId: submissionId,
        reason: 'plagiarism',
        reporterId: outsider,
      }),
    );

    unwrap(
      await decideReportResolver(db, {
        decision: hackathons.reportDecisionSchema.parse({
          targetType: 'submission',
          targetId: submissionId,
          decision: 'disqualify',
          reason: 'The code was copied from another team.',
          evidence: 'https://github.com/other-team/ledger',
        }),
        actorUserId: operator,
        accessSubject: 'operator@founders.coffee',
      }),
    );

    const week = await followUpsOf(eventId, 'hackathon_followup_week');
    expect(week.map((row) => row.status)).toEqual(['cancelled', 'cancelled']);
    expect(codeOf(await answer(eventId, captain))).toBe(
      'feedback_not_attended',
    );
  });
});
