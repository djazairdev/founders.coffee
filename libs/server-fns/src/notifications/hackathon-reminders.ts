import {
  HACKATHON_DEADLINE_REMINDER_KEYS,
  HACKATHON_ORGANISER_REMINDER_KEYS,
  HACKATHON_PARTICIPANT_REMINDER_KEYS,
  id,
  type HackathonDeadlineReminderKey,
} from '@founders-coffee/core';
import {
  cancelNotificationsByTemplate,
  cancelNotificationsByUserTemplate,
  enqueueNotification,
  getHackathon,
  getNotificationContact,
  listHackathonOrganiserContacts,
  moveNotificationsByTemplate,
  readDeadlineReminderStanding,
  type Db,
  type Event,
  type Hackathon,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { reportError } from '@founders-coffee/observability';

import { channelPlanFor } from './channel-plan.js';
import {
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

const isDeadline = (
  templateKey: string,
): templateKey is HackathonDeadlineReminderKey =>
  (HACKATHON_DEADLINE_REMINDER_KEYS as readonly string[]).includes(templateKey);

/**
 * Write one member's reminders, rendered in their language, each at its time. The messages name no
 * date, only how far away the moment is, so a date change moves a row without rewriting it. A
 * deadline reminder for a member in a team names the team and opens its project (B-SUB-07).
 */
const enqueueFor = async (
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
    const shown = named?.values ?? { ...values, team: '' };
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
