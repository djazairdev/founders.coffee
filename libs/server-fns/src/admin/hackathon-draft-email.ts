import { AppError, err, ok, type Result } from '@founders-coffee/core';
import { getEvent, type Db } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import {
  renderEmail,
  type EmailProvider,
  type RenderedEmail,
} from '@founders-coffee/email';
import {
  NotificationEmail,
  renderHackathonOutreachEmail,
} from '@founders-coffee/email/templates';
import {
  email_hackathon_draft_reminder_cta,
  email_hackathon_draft_reminder_greeting,
  email_hackathon_draft_reminder_line,
  email_hackathon_draft_reminder_preview,
  email_hackathon_draft_reminder_subject,
  type Locale,
} from '@founders-coffee/i18n';
import { logger } from '@founders-coffee/observability';

import { workerEnv } from '../env.js';

export type HackathonDraftEmailResult = { readonly eventId: string };

const renderDraftCompletionReminderEmail = async (
  eventId: string,
  title: string,
  locale: Locale,
  publicAppUrl: string,
): Promise<RenderedEmail & { readonly subject: string }> => {
  const options = { locale };
  const message = { title };
  const subject = email_hackathon_draft_reminder_subject(message, options);
  const rendered = await renderEmail(NotificationEmail, {
    locale,
    preview: email_hackathon_draft_reminder_preview(message, options),
    greeting: email_hackathon_draft_reminder_greeting({}, options),
    lines: [email_hackathon_draft_reminder_line(message, options)],
    cta: {
      label: email_hackathon_draft_reminder_cta({}, options),
      href: `${publicAppUrl}/${locale}/hackathon/${encodeURIComponent(eventId)}/manage`,
    },
  });

  return { subject, ...rendered };
};

export const sendHackathonDraftEmailResolver = async (
  db: Db,
  provider: EmailProvider | null,
  input: hackathons.HackathonDraftEmailInput,
  actor: {
    readonly actorUserId: string;
    readonly accessSubject: string | null;
  },
): Promise<Result<HackathonDraftEmailResult>> => {
  const event = await getEvent(db, input.eventId);
  if (!event || event.kind !== 'hackathon' || event.status !== 'draft')
    return err(
      new AppError('hackathon_draft_not_found', 'Hackathon draft not found'),
    );

  if (!provider) {
    logger.error('hackathon_draft_email_unavailable', {
      eventId: event.id,
      actorUserId: actor.actorUserId,
      accessSubject: actor.accessSubject,
    });
    return err(
      new AppError('email_unavailable', 'Email service is unavailable'),
    );
  }

  let rendered: RenderedEmail & {
    readonly from?: string | { readonly email: string; readonly name: string };
    readonly replyTo?: string;
    readonly subject: string;
  };
  if (input.template === 'hackathon-outreach') {
    rendered = await renderHackathonOutreachEmail(input.locale);
  } else {
    const publicAppUrl = workerEnv().PUBLIC_APP_URL?.replace(/\/+$/u, '');
    if (!publicAppUrl) {
      logger.error('hackathon_draft_email_unavailable', {
        eventId: event.id,
        actorUserId: actor.actorUserId,
        accessSubject: actor.accessSubject,
      });
      return err(
        new AppError('email_unavailable', 'Email service is unavailable'),
      );
    }
    rendered = await renderDraftCompletionReminderEmail(
      event.id,
      event.title,
      input.locale,
      publicAppUrl,
    );
  }

  const sent = await provider.send({
    to: input.recipient,
    ...rendered,
  });

  if (!sent.ok) {
    logger.error('hackathon_draft_email_failed', {
      eventId: event.id,
      actorUserId: actor.actorUserId,
      accessSubject: actor.accessSubject,
      code: sent.error.code,
    });
    return err(new AppError('email_send_failed', 'Could not send email'));
  }

  logger.info('hackathon_draft_email_sent', {
    eventId: event.id,
    actorUserId: actor.actorUserId,
    accessSubject: actor.accessSubject,
    template: input.template,
  });
  return ok({ eventId: event.id });
};
