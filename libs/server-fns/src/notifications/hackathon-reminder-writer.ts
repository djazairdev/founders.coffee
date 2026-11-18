import {
  HACKATHON_DEADLINE_REMINDER_KEYS,
  HACKATHON_JUDGE_REMINDER_KEYS,
  id,
  type HackathonDeadlineReminderKey,
} from '@founders-coffee/core';
import {
  enqueueNotification,
  getNotificationContact,
  type Db,
  type Event,
  type Hackathon,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { reportError } from '@founders-coffee/observability';

import { channelPlanFor } from './channel-plan.js';
import {
  hackathonJudgeUrlFor,
  hackathonSubmitUrlFor,
  resolveNotificationContext,
} from './context.js';
import { renderNotificationEmail } from './email-templates.js';
import {
  REMINDER_MESSAGES,
  TEAM_DEADLINE_MESSAGES,
} from './hackathon-reminder-messages.js';
import {
  validPayload,
  valuesFor,
  type NotificationPayload,
} from './producer.js';
import { armNotificationSchedule } from './schedule.js';
import { escapeHtml, escapeValues } from './templates.js';

export type Found = { readonly event: Event; readonly hackathon: Hackathon };

export const timelineOf = ({ event, hackathon }: Found) => ({
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
export const dueReminders = (
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

export const isDeadline = (
  templateKey: string,
): templateKey is HackathonDeadlineReminderKey =>
  (HACKATHON_DEADLINE_REMINDER_KEYS as readonly string[]).includes(templateKey);

/**
 * Write one member's reminders, rendered in their language, each at its time. The messages name no
 * date, only how far away the moment is, so a date change moves a row without rewriting it. A
 * deadline reminder for a member in a team names the team and opens its project (B-SUB-07).
 */
export const enqueueFor = async (
  db: Db,
  found: Found,
  userId: string,
  reminders: readonly hackathons.HackathonReminder[],
  opts: { readonly locale?: string | null; readonly team?: string | null } = {},
): Promise<void> => {
  const contact = await getNotificationContact(db, userId);
  if (!contact) return;
  const { event } = found;
  const context = await resolveNotificationContext(db, {
    preferred: opts.locale ?? contact.localePref,
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
  const team = opts.team ?? null;
  const teamValues =
    team === null
      ? null
      : {
          ...values,
          team,
          url: hackathonSubmitUrlFor(context.locale, event.id),
        };
  for (const reminder of reminders) {
    const plan = channelPlanFor(contact, reminder.templateKey);
    if (!plan) continue;
    const named =
      teamValues && isDeadline(reminder.templateKey)
        ? {
            messages: TEAM_DEADLINE_MESSAGES[reminder.templateKey],
            values: teamValues,
          }
        : null;
    const [pushTitle, pushBody, subject, html, text] =
      named?.messages ?? REMINDER_MESSAGES[reminder.templateKey];
    const shown = named?.values ?? {
      ...values,
      team: '',
      ...((HACKATHON_JUDGE_REMINDER_KEYS as readonly string[]).includes(
        reminder.templateKey,
      )
        ? { url: hackathonJudgeUrlFor(context.locale, event.id) }
        : {}),
    };
    const payload = {
      ...base,
      pushTitle: pushTitle(shown, options),
      pushBody: pushBody(shown, options),
      pushUrl: shown.url,
      ...(await renderNotificationEmail(
        context.locale,
        subject(shown, options),
        html({ ...escapeValues(shown), team: escapeHtml(team ?? '') }, options),
        text(shown, options),
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
export const quietly = async (
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

export const armEarliest = async (
  eventId: string,
  reminders: readonly hackathons.HackathonReminder[],
): Promise<void> => {
  const earliest = Math.min(...reminders.map((reminder) => reminder.sendAt));
  if (Number.isFinite(earliest))
    await armNotificationSchedule(eventId, new Date(earliest));
};
