import {
  id,
  type HackathonRegistrationTemplateKey,
  type Locale,
} from '@founders-coffee/core';
import {
  enqueueNotification,
  getNotificationContact,
  type Db,
} from '@founders-coffee/db';
import {
  ntf_email_hackathon_promoted_html,
  ntf_email_hackathon_promoted_subject,
  ntf_email_hackathon_promoted_text,
  ntf_email_hackathon_registered_html,
  ntf_email_hackathon_registered_subject,
  ntf_email_hackathon_registered_text,
  ntf_email_hackathon_waitlisted_html,
  ntf_email_hackathon_waitlisted_subject,
  ntf_email_hackathon_waitlisted_text,
  ntf_push_hackathon_promoted_body,
  ntf_push_hackathon_promoted_title,
  ntf_push_hackathon_registered_body,
  ntf_push_hackathon_registered_title,
  ntf_push_hackathon_waitlisted_body,
  ntf_push_hackathon_waitlisted_title,
} from '@founders-coffee/i18n';

import { channelPlanFor } from './channel-plan.js';
import { resolveNotificationContext } from './context.js';
import {
  renderNotificationEmail,
  type EmailPayload,
} from './email-templates.js';
import {
  validPayload,
  valuesFor,
  type NotificationPayload,
} from './producer.js';
import { armNotificationSchedule } from './schedule.js';
import { escapeValues, type TemplateValues } from './templates.js';

type Message = (values: TemplateValues, options: { locale: Locale }) => string;

const MESSAGES: Record<
  HackathonRegistrationTemplateKey,
  {
    readonly pushTitle: Message;
    readonly pushBody: Message;
    readonly subject: Message;
    readonly html: Message;
    readonly text: Message;
  }
> = {
  hackathon_registered: {
    pushTitle: ntf_push_hackathon_registered_title,
    pushBody: ntf_push_hackathon_registered_body,
    subject: ntf_email_hackathon_registered_subject,
    html: ntf_email_hackathon_registered_html,
    text: ntf_email_hackathon_registered_text,
  },
  hackathon_waitlisted: {
    pushTitle: ntf_push_hackathon_waitlisted_title,
    pushBody: ntf_push_hackathon_waitlisted_body,
    subject: ntf_email_hackathon_waitlisted_subject,
    html: ntf_email_hackathon_waitlisted_html,
    text: ntf_email_hackathon_waitlisted_text,
  },
  hackathon_promoted: {
    pushTitle: ntf_push_hackathon_promoted_title,
    pushBody: ntf_push_hackathon_promoted_body,
    subject: ntf_email_hackathon_promoted_subject,
    html: ntf_email_hackathon_promoted_html,
    text: ntf_email_hackathon_promoted_text,
  },
};

/** The push and email forms of a registration notice, in the reader's language. */
export const hackathonRegistrationMessage = async (
  templateKey: HackathonRegistrationTemplateKey,
  values: TemplateValues,
  locale: Locale,
): Promise<
  { pushTitle: string; pushBody: string; pushUrl: string } & EmailPayload
> => {
  const messages = MESSAGES[templateKey];
  const options = { locale };
  return {
    pushTitle: messages.pushTitle(values, options),
    pushBody: messages.pushBody(values, options),
    pushUrl: values.url,
    ...(await renderNotificationEmail(
      locale,
      messages.subject(values, options),
      messages.html(escapeValues(values), options),
      messages.text(values, options),
    )),
  };
};

/**
 * Tell a member where they stand after registering for a hackathon (B-REG-07): registered, on the
 * waitlist, or registered after all because someone withdrew and they were first on the list.
 *
 * Push goes first with email behind it, as the member set the Hackathons category; the category's
 * switch is honoured again at send time, so turning it off after registering still stops the
 * notice. The kickoff is the hackathon's start, in the market's time zone.
 */
export const enqueueHackathonRegistrationNotice = async (
  db: Db,
  opts: {
    templateKey: HackathonRegistrationTemplateKey;
    eventId: string;
    userId: string;
    eventTitle: string;
    eventSlug: string;
    marketCode: string;
    startsAt: Date;
    venue: string | null;
    locale?: string | null;
  },
): Promise<void> => {
  const contact = await getNotificationContact(db, opts.userId);
  if (!contact) return;
  const plan = channelPlanFor(contact, opts.templateKey);
  if (!plan) return;
  const context = await resolveNotificationContext(db, {
    preferred: opts.locale,
    marketCode: opts.marketCode,
  });
  const basePayload: NotificationPayload = {
    email: contact.email,
    eventTitle: opts.eventTitle,
    eventSlug: opts.eventSlug,
    marketCode: opts.marketCode,
    startsAt: opts.startsAt.toISOString(),
    ...(opts.venue ? { venue: opts.venue } : {}),
    locale: context.locale,
  };
  const payload = {
    ...basePayload,
    ...(await hackathonRegistrationMessage(
      opts.templateKey,
      valuesFor(basePayload, context, true),
      context.locale,
    )),
  };
  const sendAt = new Date();
  await enqueueNotification(db, {
    id: id('ntf'),
    eventId: opts.eventId,
    userId: opts.userId,
    channel: plan.primary,
    templateKey: opts.templateKey,
    payload: plan.fallback
      ? validPayload(plan.fallback, validPayload(plan.primary, payload))
      : validPayload(plan.primary, payload),
    sendAt,
    fallbackChannel: plan.fallback ?? undefined,
  });
  await armNotificationSchedule(opts.eventId, sendAt);
};
