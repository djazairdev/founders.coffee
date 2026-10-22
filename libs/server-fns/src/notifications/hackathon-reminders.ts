import {
  HACKATHON_ORGANISER_REMINDER_KEYS,
  HACKATHON_PARTICIPANT_REMINDER_KEYS,
  id,
} from '@founders-coffee/core';
import {
  cancelNotificationsByTemplate,
  cancelNotificationsByUserTemplate,
  enqueueNotification,
  getHackathon,
  getNotificationContact,
  listHackathonOrganiserContacts,
  moveNotificationsByTemplate,
  type Db,
  type Event,
  type Hackathon,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { reportError } from '@founders-coffee/observability';

import { channelPlanFor } from './channel-plan.js';
import { resolveNotificationContext } from './context.js';
import { renderNotificationEmail } from './email-templates.js';
import { REMINDER_MESSAGES } from './hackathon-reminder-messages.js';
import {
  validPayload,
  valuesFor,
  type NotificationPayload,
} from './producer.js';
import { armNotificationSchedule } from './schedule.js';
import { escapeValues } from './templates.js';

type Found = { readonly event: Event; readonly hackathon: Hackathon };

const timelineOf = ({ event, hackathon }: Found) => ({
  registrationOpensAt: hackathon.registrationOpensAt.getTime(),
  registrationClosesAt: hackathon.registrationClosesAt.getTime(),
  kickoffAt: event.startsAt.getTime(),
  submissionDeadlineAt: hackathon.submissionDeadlineAt.getTime(),
  endsAt: (event.endsAt ?? event.startsAt).getTime(),
  judgingEndsAt: hackathon.judgingEndsAt.getTime(),
});

/**
 * The reminders still ahead for an audience of a published hackathon, or none for one that is not
 * published, which nobody is waiting for.
 */
const dueReminders = (
  found: Found | null,
  audience: hackathons.HackathonReminder['audience'],
  now: number,
): hackathons.HackathonReminder[] =>
  found?.event.status === 'published'
    ? hackathons
        .hackathonReminders(timelineOf(found))
        .filter(
          (reminder) => reminder.audience === audience && reminder.sendAt > now,
        )
    : [];

/**
 * Write one member's reminders, rendered in their language, each at its time. The messages name no
 * date, only how far away the moment is, so a date change moves a row without rewriting it.
 */
const enqueueFor = async (
  db: Db,
  found: Found,
  userId: string,
  reminders: readonly hackathons.HackathonReminder[],
  locale?: string | null,
): Promise<void> => {
  const contact = await getNotificationContact(db, userId);
  if (!contact) return;
  const { event } = found;
  const context = await resolveNotificationContext(db, {
    preferred: locale ?? contact.localePref,
    marketCode: event.marketCode,
  });
  const base: NotificationPayload = {
    email: contact.email,
    eventTitle: event.title,
    eventSlug: event.slug,
    marketCode: event.marketCode,
    startsAt: event.startsAt.toISOString(),
    locale: context.locale,
  };
  const values = valuesFor(base, context, true);
  const options = { locale: context.locale };
  for (const reminder of reminders) {
    const plan = channelPlanFor(contact, reminder.templateKey);
    if (!plan) continue;
    const [pushTitle, pushBody, subject, html, text] =
      REMINDER_MESSAGES[reminder.templateKey];
    const payload = {
      ...base,
      pushTitle: pushTitle(values, options),
      pushBody: pushBody(values, options),
      pushUrl: values.url,
      ...(await renderNotificationEmail(
        context.locale,
        subject(values, options),
        html(escapeValues(values), options),
        text(values, options),
      )),
    };
    await enqueueNotification(db, {
      id: id('ntf'),
      eventId: event.id,
      userId,
      channel: plan.primary,
      templateKey: reminder.templateKey,
      payload: plan.fallback
        ? validPayload(plan.fallback, validPayload(plan.primary, payload))
        : validPayload(plan.primary, payload),
      sendAt: new Date(reminder.sendAt),
      fallbackChannel: plan.fallback ?? undefined,
    });
  }
};

/**
 * Run a reminder change and report, rather than throw, any failure: the approval, registration or
 * date change that called it has already happened, and a reminder is not worth undoing it for.
 */
const quietly = async (
  operation: string,
  eventId: string,
  run: () => Promise<void>,
): Promise<void> => {
  try {
    await run();
  } catch (error) {
    reportError(error, { operation, eventId });
  }
};

const armEarliest = async (
  eventId: string,
  reminders: readonly hackathons.HackathonReminder[],
): Promise<void> => {
  const earliest = Math.min(...reminders.map((reminder) => reminder.sendAt));
  if (Number.isFinite(earliest))
    await armNotificationSchedule(eventId, new Date(earliest));
};

/**
 * Schedule the organisers' reminders for a hackathon just approved (B-HKN-21): that registration
 * closes in 24 hours and that judging has opened, for the member who created it and every owner of
 * the organisation that leads it. Any the hackathon already had are replaced.
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
    await enqueueFor(db, found, opts.userId, reminders, opts.locale);
    await armEarliest(opts.eventId, reminders);
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
