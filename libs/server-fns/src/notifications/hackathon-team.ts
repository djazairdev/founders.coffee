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
  ntf_email_hackathon_results_certificate_html,
  ntf_email_hackathon_results_certificate_text,
  ntf_team_member_unnamed,
} from '@founders-coffee/i18n';

import { channelPlanFor } from './channel-plan.js';
import {
  hackathonJudgeUrlFor,
  hackathonLookingUrlFor,
  hackathonSubmitUrlFor,
  hackathonTeamUrlFor,
  resolveNotificationContext,
} from './context.js';
import { renderNotificationEmail } from './email-templates.js';
import { MESSAGES, type TeamValues } from './hackathon-team-messages.js';
import { validPayload, type NotificationPayload } from './producer.js';
import { armNotificationSchedule } from './schedule.js';
import { escapeHtml } from './templates.js';

const URLS: Partial<
  Record<HackathonTeamTemplateKey, (locale: Locale, eventId: string) => string>
> = {
  hackathon_team_declined: hackathonLookingUrlFor,
  hackathon_submission_received: hackathonSubmitUrlFor,
  hackathon_judge_reminder: hackathonJudgeUrlFor,
  hackathon_judge_accepted: hackathonJudgeUrlFor,
};

/**
 * The push and email forms of a team notice, in the reader's language. A certificate's address adds
 * a line to the email only (B-CRT-03): a push opens one page, and that stays the notice's own.
 */
export const hackathonTeamMessage = async (
  templateKey: HackathonTeamTemplateKey,
  values: TeamValues,
  locale: Locale,
  certificateUrl: string | null = null,
) => {
  const [pushTitle, pushBody, subject, html, text] = MESSAGES[templateKey];
  const options = { locale };
  const safe = {
    title: escapeHtml(values.title),
    team: escapeHtml(values.team),
    name: escapeHtml(values.name),
    project: escapeHtml(values.project),
    reason: escapeHtml(values.reason),
    url: escapeHtml(values.url),
  };
  return {
    pushTitle: pushTitle(values, options),
    pushBody: pushBody(values, options),
    pushUrl: values.url,
    ...(await renderNotificationEmail(
      locale,
      subject(values, options),
      certificateUrl
        ? `${html(safe, options)}${ntf_email_hackathon_results_certificate_html({ url: escapeHtml(certificateUrl) }, options)}`
        : html(safe, options),
      certificateUrl
        ? `${text(values, options)}\n\n${ntf_email_hackathon_results_certificate_text({ url: certificateUrl }, options)}`
        : text(values, options),
    )),
  };
};

/**
 * Tell members of a hackathon what changed in a team (B-TEAM-09): a request to join it, the answer
 * to one, a member who joined, or one who is no longer in it; or that its project was submitted,
 * the receipt every member gets (B-SUB-07); or that an administrator disqualified it, with the reason
 * they gave (B-SAFE-02). An organiser's reminder to judges (B-JDG-08) goes the same way, to the
 * judge's list.
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
    readonly reason?: string;
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
          reason: opts.reason ?? '',
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
