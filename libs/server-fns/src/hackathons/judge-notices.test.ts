import { beforeEach, describe, expect, it } from 'vitest';

import {
  and,
  eq,
  events,
  hackathons as hackathonRows,
  scheduledNotifications,
  user,
  type Db,
} from '@founders-coffee/db';

import { TEST_HOST_ID } from '../events/resolver.fixtures.js';
import { moveHackathonReminders } from '../notifications/hackathon-reminders.js';
import {
  hackathonWithDetails,
  ORGANISATION,
  setupHackathonDb,
} from './edit.fixtures.js';
import {
  answerJudgeInviteResolver,
  createJudgeInviteResolver,
  removeJudgeResolver,
} from './judges.js';
import { unwrap } from './judging.fixtures.js';

const JUDGE = 'usr_judge_notice';

let db: Db;

const organiser = (eventId: string) => ({
  eventId,
  userId: TEST_HOST_ID,
  organisationId: ORGANISATION,
});

const accepted = async (isPublished = true) => {
  const { eventId } = await hackathonWithDetails(db);
  if (isPublished)
    await db
      .update(events)
      .set({ status: 'published' })
      .where(eq(events.id, eventId));
  const link = unwrap(await createJudgeInviteResolver(db, organiser(eventId)));
  const answer = () =>
    answerJudgeInviteResolver(db, {
      token: link.token,
      answer: 'accept',
      userId: JUDGE,
    });
  unwrap(await answer());
  return { eventId, judgeId: link.judgeId, answer };
};

const noticesOf = (eventId: string, templateKey: string) =>
  db
    .select({
      status: scheduledNotifications.status,
      sendAt: scheduledNotifications.sendAt,
      payload: scheduledNotifications.payload,
    })
    .from(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.eventId, eventId),
        eq(scheduledNotifications.userId, JUDGE),
        eq(scheduledNotifications.templateKey, templateKey as never),
      ),
    );

const pending = async (eventId: string, templateKey: string) =>
  (await noticesOf(eventId, templateKey)).filter(
    (row) => row.status === 'pending',
  );

const deadlineOf = async (eventId: string) => {
  const [row] = await db
    .select({ at: hackathonRows.submissionDeadlineAt })
    .from(hackathonRows)
    .where(eq(hackathonRows.eventId, eventId));
  return row?.at;
};

describe('a judge’s notices (B-JDG-11, real D1)', () => {
  beforeEach(async () => {
    db = await setupHackathonDb();
    await db
      .insert(user)
      .values({
        id: JUDGE,
        name: 'Judge',
        email: `${JUDGE}@judges.test`,
        emailVerified: true,
        role: 'member',
      })
      .onConflictDoNothing();
  });

  it('tells a member who accepted, and schedules the notice that judging has opened', async () => {
    const { eventId } = await accepted();

    const [notice] = await pending(eventId, 'hackathon_judge_accepted');
    expect((notice?.payload as { pushUrl: string }).pushUrl).toContain(
      `/hackathon/${eventId}/judge`,
    );
    const [opening] = await pending(eventId, 'hackathon_judge_judging_open');
    expect(opening?.sendAt).toEqual(await deadlineOf(eventId));
    expect((opening?.payload as { pushUrl: string }).pushUrl).toContain(
      `/hackathon/${eventId}/judge`,
    );
  });

  it('tells them once, however often the link is opened again', async () => {
    const { eventId, answer } = await accepted();

    unwrap(await answer());

    expect(await pending(eventId, 'hackathon_judge_accepted')).toHaveLength(1);
    expect(await pending(eventId, 'hackathon_judge_judging_open')).toHaveLength(
      1,
    );
  });

  it('moves the notice with the deadline', async () => {
    const { eventId } = await accepted();
    const moved = new Date(
      ((await deadlineOf(eventId))?.getTime() ?? 0) + 3_600_000,
    );
    await db
      .update(hackathonRows)
      .set({ submissionDeadlineAt: moved })
      .where(eq(hackathonRows.eventId, eventId));

    await moveHackathonReminders(db, eventId);

    const [opening] = await pending(eventId, 'hackathon_judge_judging_open');
    expect(opening?.sendAt).toEqual(moved);
  });

  it('withdraws the notice when the judge is removed', async () => {
    const { eventId, judgeId } = await accepted();

    unwrap(await removeJudgeResolver(db, { ...organiser(eventId), judgeId }));

    expect(await pending(eventId, 'hackathon_judge_judging_open')).toEqual([]);
  });

  it('sends a member who declined nothing', async () => {
    const { eventId } = await hackathonWithDetails(db);
    const link = unwrap(
      await createJudgeInviteResolver(db, organiser(eventId)),
    );

    unwrap(
      await answerJudgeInviteResolver(db, {
        token: link.token,
        answer: 'decline',
        userId: JUDGE,
      }),
    );

    expect(await noticesOf(eventId, 'hackathon_judge_accepted')).toEqual([]);
  });
});
