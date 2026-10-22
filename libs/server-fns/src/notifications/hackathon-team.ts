import {
  id,
  type HackathonTeamTemplateKey,
  type Locale,
} from '@founders-coffee/core';
import {
  enqueueNotification,
  getNotificationContact,
  type Db,
  type Event,
} from '@founders-coffee/db';
import {
  ntf_email_hackathon_team_accepted_html,
  ntf_email_hackathon_team_accepted_subject,
  ntf_email_hackathon_team_accepted_text,
  ntf_email_hackathon_team_declined_html,
  ntf_email_hackathon_team_declined_subject,
  ntf_email_hackathon_team_declined_text,
  ntf_email_hackathon_team_joined_html,
  ntf_email_hackathon_team_joined_subject,
  ntf_email_hackathon_team_joined_text,
  ntf_email_hackathon_team_left_html,
  ntf_email_hackathon_team_left_subject,
  ntf_email_hackathon_team_left_text,
  ntf_email_hackathon_team_request_html,
  ntf_email_hackathon_team_request_subject,
  ntf_email_hackathon_team_request_text,
  ntf_email_hackathon_submission_received_html,
  ntf_email_hackathon_submission_received_subject,
  ntf_email_hackathon_submission_received_text,
  ntf_push_hackathon_team_accepted_body,
  ntf_push_hackathon_team_accepted_title,
  ntf_push_hackathon_team_declined_body,
  ntf_push_hackathon_team_declined_title,
  ntf_push_hackathon_team_joined_body,
  ntf_push_hackathon_team_joined_title,
  ntf_push_hackathon_team_left_body,
  ntf_push_hackathon_team_left_title,
  ntf_push_hackathon_team_request_body,
  ntf_push_hackathon_team_request_title,
  ntf_push_hackathon_submission_received_body,
  ntf_push_hackathon_submission_received_title,
  ntf_team_member_unnamed,
} from '@founders-coffee/i18n';

import { channelPlanFor } from './channel-plan.js';
import {
  hackathonLookingUrlFor,
  hackathonSubmitUrlFor,
  hackathonTeamUrlFor,
  resolveNotificationContext,
} from './context.js';
import { renderNotificationEmail } from './email-templates.js';
import { validPayload, type NotificationPayload } from './producer.js';
import { armNotificationSchedule } from './schedule.js';
import { escapeHtml } from './templates.js';

type TeamValues = {
  readonly title: string;
  readonly team: string;
  readonly name: string;
  readonly project: string;
  readonly url: string;
};

type Message = (values: TeamValues, options: { locale: Locale }) => string;

const MESSAGES: Record<
  HackathonTeamTemplateKey,
  readonly [Message, Message, Message, Message, Message]
> = {
  hackathon_team_request: [
    ntf_push_hackathon_team_request_title,
    ntf_push_hackathon_team_request_body,
    ntf_email_hackathon_team_request_subject,
    ntf_email_hackathon_team_request_html,
    ntf_email_hackathon_team_request_text,
  ],
  hackathon_team_accepted: [
    ntf_push_hackathon_team_accepted_title,
    ntf_push_hackathon_team_accepted_body,
    ntf_email_hackathon_team_accepted_subject,
    ntf_email_hackathon_team_accepted_html,
    ntf_email_hackathon_team_accepted_text,
  ],
  hackathon_team_declined: [
    ntf_push_hackathon_team_declined_title,
    ntf_push_hackathon_team_declined_body,
    ntf_email_hackathon_team_declined_subject,
    ntf_email_hackathon_team_declined_html,
    ntf_email_hackathon_team_declined_text,
  ],
  hackathon_team_joined: [
    ntf_push_hackathon_team_joined_title,
    ntf_push_hackathon_team_joined_body,
    ntf_email_hackathon_team_joined_subject,
    ntf_email_hackathon_team_joined_html,
    ntf_email_hackathon_team_joined_text,
  ],
  hackathon_team_left: [
    ntf_push_hackathon_team_left_title,
    ntf_push_hackathon_team_left_body,
    ntf_email_hackathon_team_left_subject,
    ntf_email_hackathon_team_left_html,
    ntf_email_hackathon_team_left_text,
  ],
  hackathon_submission_received: [
    ntf_push_hackathon_submission_received_title,
    ntf_push_hackathon_submission_received_body,
    ntf_email_hackathon_submission_received_subject,
    ntf_email_hackathon_submission_received_html,
    ntf_email_hackathon_submission_received_text,
  ],
};

const URLS: Partial<
  Record<HackathonTeamTemplateKey, (locale: Locale, eventId: string) => string>
> = {
  hackathon_team_declined: hackathonLookingUrlFor,
  hackathon_submission_received: hackathonSubmitUrlFor,
};

/** The push and email forms of a team notice, in the reader's language. */
export const hackathonTeamMessage = async (
  templateKey: HackathonTeamTemplateKey,
  values: TeamValues,
  locale: Locale,
) => {
  const [pushTitle, pushBody, subject, html, text] = MESSAGES[templateKey];
  const options = { locale };
  const safe = {
    title: escapeHtml(values.title),
    team: escapeHtml(values.team),
    name: escapeHtml(values.name),
    project: escapeHtml(values.project),
    url: escapeHtml(values.url),
  };
  return {
    pushTitle: pushTitle(values, options),
    pushBody: pushBody(values, options),
    pushUrl: values.url,
    ...(await renderNotificationEmail(
      locale,
      subject(values, options),
      html(safe, options),
      text(values, options),
    )),
  };
};

/**
 * Tell members of a hackathon what changed in a team (B-TEAM-09): a request to join it, the answer
 * to one, a member who joined, or one who is no longer in it; or that its project was submitted,
 * the receipt every member gets (B-SUB-07).
 *
 * Each notice is written in its reader's language and follows their Hackathons category, push
 * first with email behind it; the category's switch is honoured again at send time. A declined
 * request links to who is looking for a team, a receipt to the team's project, every other notice
 * to the reader's team page.
 */
export const enqueueHackathonTeamNotices = async (
  db: Db,
  opts: {
    readonly templateKey: HackathonTeamTemplateKey;
    readonly event: Pick<
      Event,
      'id' | 'title' | 'slug' | 'marketCode' | 'startsAt'
    >;
    readonly recipients: readonly string[];
    readonly team: string;
    readonly name: string | null;
    readonly project?: string;
  },
): Promise<void> => {
  const { event } = opts;
  const sendAt = new Date();
  let isQueued = false;
  for (const userId of opts.recipients) {
    const contact = await getNotificationContact(db, userId);
    if (!contact) continue;
    const plan = channelPlanFor(contact, opts.templateKey);
    if (!plan) continue;
    const { locale } = await resolveNotificationContext(db, {
      preferred: contact.localePref,
      marketCode: event.marketCode,
    });
    const basePayload: NotificationPayload = {
      email: contact.email,
      eventTitle: event.title,
      eventSlug: event.slug,
      marketCode: event.marketCode,
      startsAt: event.startsAt.toISOString(),
      locale,
    };
    const url = (URLS[opts.templateKey] ?? hackathonTeamUrlFor)(
      locale,
      event.id,
    );
    const payload = {
      ...basePayload,
      ...(await hackathonTeamMessage(
        opts.templateKey,
        {
          title: event.title,
          team: opts.team,
          name: opts.name ?? ntf_team_member_unnamed({}, { locale }),
          project: opts.project ?? '',
          url,
        },
        locale,
      )),
    };
    await enqueueNotification(db, {
      id: id('ntf'),
      eventId: event.id,
      userId,
      channel: plan.primary,
      templateKey: opts.templateKey,
      payload: plan.fallback
        ? validPayload(plan.fallback, validPayload(plan.primary, payload))
        : validPayload(plan.primary, payload),
      sendAt,
      fallbackChannel: plan.fallback ?? undefined,
    });
    isQueued = true;
  }
  if (isQueued) await armNotificationSchedule(event.id, sendAt);
};
