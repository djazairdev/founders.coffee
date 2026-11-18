import type { HackathonTeamTemplateKey } from '@founders-coffee/core';
import {
  communityOperationsEnabled,
  enqueueNotificationIfAbsent,
  getHackathon,
  getNotificationContact,
  listResultsNoticeRecipients,
  type Db,
} from '@founders-coffee/db';

import { channelPlanFor } from './channel-plan.js';
import { operations } from '@founders-coffee/domain';

import {
  certificateUrlFor,
  feedbackUrlFor,
  hackathonTeamUrlFor,
  resolveNotificationContext,
} from './context.js';
import { hackathonTeamMessage } from './hackathon-team.js';
import {
  validPayload,
  valuesFor,
  type NotificationPayload,
} from './producer.js';
import { armNotificationSchedule } from './schedule.js';

/**
 * Write one batch of the notice that a hackathon's results are out (B-JDG-11), one row per member in
 * their language, following their Hackathons category. A member whose team was scored is told their
 * feedback is ready and sent to their team page (B-JDG-12); everyone else, to the hackathon's page.
 * The email links the member's own certificate if they hold one (B-CRT-03).
 * A member of a team still in the results also gets the follow-ups, written now and sent a week and a
 * month after the results (B-OPS-03): how it went, if the market collects feedback, and whether the
 * team is still building. Each row's id is fixed by the hackathon and
 * the member, so a queue message delivered twice writes nothing new. Answers where the next batch
 * starts, `null` once the list is done.
 */
export const enqueueResultsNoticeBatch = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly afterUserId: string | null;
    readonly limit: number;
  },
): Promise<{ readonly written: number; readonly next: string | null }> => {
  const found = await getHackathon(db, input.eventId);
  if (!found?.hackathon.resultsPublishedAt) return { written: 0, next: null };
  const { event } = found;
  const recipients = await listResultsNoticeRecipients(db, input);
  const sendAt = new Date();
  const publishedAt = found.hackathon.resultsPublishedAt.getTime();
  const canAskFeedback = await communityOperationsEnabled(db, event.marketCode);
  const messages = new Map<string, Record<string, string>>();
  let written = 0;
  let firstFollowUp: Date | null = null;
  for (const {
    userId,
    hasFeedback,
    isOnEntry,
    certificateCode,
  } of recipients) {
    const contact = await getNotificationContact(db, userId);
    if (!contact) continue;
    const context = await resolveNotificationContext(db, {
      preferred: contact.localePref,
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
    const queue = async (notice: {
      readonly id: string;
      readonly templateKey: HackathonTeamTemplateKey;
      readonly url: string;
      readonly sendAt: Date;
      readonly certificateUrl?: string;
    }): Promise<boolean> => {
      const plan = channelPlanFor(contact, notice.templateKey);
      if (!plan) return false;
      const messageKey = `${notice.templateKey}:${context.locale}:${notice.certificateUrl ?? ''}`;
      const message =
        messages.get(messageKey) ??
        (await hackathonTeamMessage(
          notice.templateKey,
          {
            title: event.title,
            team: '',
            name: '',
            project: '',
            reason: '',
            url: notice.url,
          },
          context.locale,
          notice.certificateUrl ?? null,
        ));
      messages.set(messageKey, message);
      const payload = { ...base, ...message };
      const queued = await enqueueNotificationIfAbsent(db, {
        id: notice.id,
        eventId: event.id,
        userId,
        channel: plan.primary,
        templateKey: notice.templateKey,
        payload: plan.fallback
          ? validPayload(plan.fallback, validPayload(plan.primary, payload))
          : validPayload(plan.primary, payload),
        sendAt: notice.sendAt,
        fallbackChannel: plan.fallback ?? undefined,
      });
      return queued.written;
    };
    const teamUrl = hackathonTeamUrlFor(context.locale, event.id);
    const isToldNow = await queue({
      id: `ntf_results_${event.id}_${userId}`,
      templateKey: hasFeedback
        ? 'hackathon_results_feedback'
        : 'hackathon_results_published',
      url: hasFeedback ? teamUrl : valuesFor(base, context, true).url,
      sendAt,
      ...(certificateCode
        ? { certificateUrl: certificateUrlFor(context.locale, certificateCode) }
        : {}),
    });
    if (isToldNow) written += 1;
    if (!isOnEntry) continue;
    const weekAt = new Date(
      publishedAt + operations.FOLLOW_UP_WEEK_AFTER_RESULTS_MS,
    );
    if (canAskFeedback)
      await queue({
        id: `ntf_followup_week_${event.id}_${userId}`,
        templateKey: 'hackathon_followup_week',
        url: feedbackUrlFor(context.locale, event.id),
        sendAt: weekAt,
      });
    await queue({
      id: `ntf_followup_month_${event.id}_${userId}`,
      templateKey: 'hackathon_followup_month',
      url: teamUrl,
      sendAt: new Date(
        publishedAt + operations.FOLLOW_UP_MONTH_AFTER_RESULTS_MS,
      ),
    });
    firstFollowUp = weekAt;
  }
  if (written > 0) await armNotificationSchedule(event.id, sendAt);
  else if (firstFollowUp)
    await armNotificationSchedule(event.id, firstFollowUp);
  return {
    written,
    next:
      recipients.length === input.limit
        ? (recipients.at(-1)?.userId ?? null)
        : null,
  };
};
