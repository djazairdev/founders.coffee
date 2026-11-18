import { listHackathonOrganiserContacts, type Db } from '@founders-coffee/db';
import { renderEmail, type EmailProvider } from '@founders-coffee/email';
import { NotificationEmail } from '@founders-coffee/email/templates';
import {
  email_hackathon_decision_approved,
  email_hackathon_decision_approved_subject,
  email_hackathon_decision_rejected,
  email_hackathon_decision_rejected_subject,
  email_org_decision_note,
  type Locale,
} from '@founders-coffee/i18n';
import type { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { resolveNotificationContext } from '../notifications/context.js';
import type { EmailPayload } from '../notifications/email-templates.js';

type Decision = hackathons.HackathonReviewDecision;

export type HackathonDecisionNotice = (
  db: Db,
  decided: {
    readonly eventId: string;
    readonly title: string;
    readonly marketCode: string;
    readonly decision: Decision;
    readonly note: string | null;
  },
) => Promise<void>;

const WORDING: Record<
  Decision,
  readonly [
    subject: typeof email_hackathon_decision_approved_subject,
    line: typeof email_hackathon_decision_approved,
  ]
> = {
  approve: [
    email_hackathon_decision_approved_subject,
    email_hackathon_decision_approved,
  ],
  reject: [
    email_hackathon_decision_rejected_subject,
    email_hackathon_decision_rejected,
  ],
};

/** The email telling an organiser what the reviewers decided about their hackathon, with the note. */
export const renderHackathonDecisionEmail = async (
  locale: Locale,
  values: {
    readonly title: string;
    readonly decision: Decision;
    readonly note: string | null;
  },
): Promise<EmailPayload> => {
  const options = { locale };
  const [subjectOf, lineOf] = WORDING[values.decision];
  const names = { title: values.title };
  const subject = subjectOf(names, options);
  const rendered = await renderEmail(NotificationEmail, {
    locale,
    preview: subject,
    lines: [
      lineOf(names, options),
      ...(values.note
        ? [email_org_decision_note({ note: values.note }, options)]
        : []),
    ],
  });
  return { subject, html: rendered.html, text: rendered.text };
};

/**
 * Tell a hackathon's organisers what the reviewers decided (B-HKN-08): the member who created it
 * and the owners of the organisation that leads it, each in the language they chose, else the
 * market's. Best effort: the decision is already written, so a failed or impossible send is logged
 * by event id and never thrown back to the operator.
 */
export const createHackathonDecisionNotice =
  (provider: EmailProvider | null): HackathonDecisionNotice =>
  async (db, { eventId, title, marketCode, decision, note }) => {
    const context = { eventId, decision };
    if (!provider) {
      logger.error('hackathon_decision_email_unbound', context);
      return;
    }
    const organisers = await listHackathonOrganiserContacts(db, eventId);
    for (const organiser of organisers) {
      const { locale } = await resolveNotificationContext(db, {
        preferred: organiser.localePref,
        marketCode,
      });
      const email = await renderHackathonDecisionEmail(locale, {
        title,
        decision,
        note,
      });
      const sent = await provider.send({ to: organiser.email, ...email });
      if (!sent.ok)
        logger.error('hackathon_decision_email_failed', {
          ...context,
          code: sent.error.code,
        });
    }
  };
