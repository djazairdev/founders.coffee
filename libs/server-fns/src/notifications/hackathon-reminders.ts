import {
  HACKATHON_DEADLINE_REMINDER_KEYS,
  HACKATHON_JUDGE_REMINDER_KEYS,
  HACKATHON_ORGANISER_REMINDER_KEYS,
  HACKATHON_PARTICIPANT_REMINDER_KEYS,
} from '@founders-coffee/core';
import {
  cancelNotificationsByTemplate,
  cancelNotificationsByUserTemplate,
  getHackathon,
  listHackathonOrganiserContacts,
  listOrganiserHackathonJudges,
  moveNotificationsByTemplate,
  readDeadlineReminderStanding,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  armEarliest,
  dueReminders,
  enqueueFor,
  isDeadline,
  quietly,
  timelineOf,
} from './hackathon-reminder-writer.js';

/**
 * Schedule the organisers' reminders for a hackathon just approved (B-HKN-21): that registration
 * closes in 24 hours and that judging has opened, for the member who created it and every owner of
 * the organisation that leads it. Any the hackathon already had are replaced. Judges who accepted
 * before the approval get their notice that judging has opened now too (B-JDG-11).
 */
export const scheduleOrganiserReminders = async (
  db: Db,
  eventId: string,
  now: number = Date.now(),
): Promise<void> =>
  quietly('schedule_organiser_reminders', eventId, async () => {
    const found = await getHackathon(db, eventId);
    const reminders = dueReminders(found, 'organisers', now);
    await cancelNotificationsByTemplate(db, {
      eventId,
      templateKeys: HACKATHON_ORGANISER_REMINDER_KEYS,
    });
    if (!found || reminders.length === 0) return;
    for (const organiser of await listHackathonOrganiserContacts(db, eventId))
      await enqueueFor(db, found, organiser.userId, reminders);
    await armEarliest(eventId, reminders);
    for (const judge of await listOrganiserHackathonJudges(db, eventId))
      if (judge.status === 'accepted' && judge.userId)
        await scheduleJudgeReminders(
          db,
          { eventId, userId: judge.userId },
          now,
        );
  });

/**
 * Schedule a participant's reminders once they hold a place (B-HKN-21): kickoff in an hour, and the
 * submission deadline in 24 hours and in one. Any they already had are replaced, so scheduling
 * them twice never doubles them.
 */
export const scheduleParticipantReminders = async (
  db: Db,
  opts: {
    readonly eventId: string;
    readonly userId: string;
    readonly locale?: string | null;
  },
  now: number = Date.now(),
): Promise<void> =>
  quietly('schedule_participant_reminders', opts.eventId, async () => {
    await cancelParticipantReminders(db, opts);
    const found = await getHackathon(db, opts.eventId);
    const reminders = dueReminders(found, 'participants', now);
    if (!found || reminders.length === 0) return;
    await enqueueFor(db, found, opts.userId, reminders, {
      locale: opts.locale,
    });
    await armEarliest(opts.eventId, reminders);
  });

/**
 * Rewrite a participant's submission-deadline reminders after their team changed or submitted
 * (B-SUB-07): they name the team the member is now in, or say they are in none, and a member whose
 * team has submitted gets none. Called for the member who started, joined or left a team, and for
 * every member of a team that just submitted.
 */
export const syncDeadlineReminders = async (
  db: Db,
  opts: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<void> =>
  quietly('sync_deadline_reminders', opts.eventId, async () => {
    await cancelNotificationsByUserTemplate(db, {
      ...opts,
      templateKeys: HACKATHON_DEADLINE_REMINDER_KEYS,
    });
    const [found, standing] = await Promise.all([
      getHackathon(db, opts.eventId),
      readDeadlineReminderStanding(db, opts),
    ]);
    if (!found || standing.hasSubmitted) return;
    const reminders = dueReminders(found, 'participants', now).filter(
      (reminder) => isDeadline(reminder.templateKey),
    );
    if (reminders.length === 0) return;
    await enqueueFor(db, found, opts.userId, reminders, {
      team: standing.teamName,
    });
    await armEarliest(opts.eventId, reminders);
  });

/**
 * Schedule the notice that judging has opened for a judge who accepted their place (B-JDG-11). Any
 * they already had is replaced; one whose moment has passed is not written.
 */
export const scheduleJudgeReminders = async (
  db: Db,
  opts: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<void> =>
  quietly('schedule_judge_reminders', opts.eventId, async () => {
    await cancelNotificationsByUserTemplate(db, {
      ...opts,
      templateKeys: HACKATHON_JUDGE_REMINDER_KEYS,
    });
    const found = await getHackathon(db, opts.eventId);
    const reminders = dueReminders(found, 'judges', now);
    if (!found || reminders.length === 0) return;
    await enqueueFor(db, found, opts.userId, reminders);
    await armEarliest(opts.eventId, reminders);
  });

/** Withdraw a judge's pending notice, when they lose their place (B-JDG-11). */
export const cancelJudgeReminders = async (
  db: Db,
  opts: { readonly eventId: string; readonly userId: string },
): Promise<void> =>
  quietly('cancel_judge_reminders', opts.eventId, async () => {
    await cancelNotificationsByUserTemplate(db, {
      ...opts,
      templateKeys: HACKATHON_JUDGE_REMINDER_KEYS,
    });
  });

/** Withdraw a participant's pending reminders, when they give up their place (B-HKN-21). */
export const cancelParticipantReminders = async (
  db: Db,
  opts: { readonly eventId: string; readonly userId: string },
): Promise<void> =>
  quietly('cancel_participant_reminders', opts.eventId, async () => {
    await cancelNotificationsByUserTemplate(db, {
      ...opts,
      templateKeys: HACKATHON_PARTICIPANT_REMINDER_KEYS,
    });
  });

/**
 * Move every pending reminder of a hackathon to its new time after a date changed (B-HKN-21), in
 * one batch, and wake the event's scheduler for the earliest. A reminder whose new time has passed
 * is cancelled.
 */
export const moveHackathonReminders = async (
  db: Db,
  eventId: string,
  now: number = Date.now(),
): Promise<void> =>
  quietly('move_hackathon_reminders', eventId, async () => {
    const found = await getHackathon(db, eventId);
    if (!found) return;
    const reminders = hackathons.hackathonReminders(timelineOf(found));
    await moveNotificationsByTemplate(db, {
      eventId,
      moves: reminders.map(({ templateKey, sendAt }) => ({
        templateKey,
        sendAt: new Date(sendAt),
      })),
    });
    await armEarliest(
      eventId,
      reminders.filter((reminder) => reminder.sendAt > now),
    );
  });
