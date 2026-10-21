import {
  listOrganisationOwnerContacts,
  type Db,
  type Organization,
} from '@founders-coffee/db';
import { renderEmail, type EmailProvider } from '@founders-coffee/email';
import { NotificationEmail } from '@founders-coffee/email/templates';
import {
  email_org_decision_approved,
  email_org_decision_approved_subject,
  email_org_decision_note,
  email_org_decision_reinstated,
  email_org_decision_reinstated_subject,
  email_org_decision_rejected,
  email_org_decision_rejected_subject,
  email_org_decision_suspended,
  email_org_decision_suspended_subject,
  type Locale,
} from '@founders-coffee/i18n';
import type { organisations } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { resolveNotificationContext } from '../notifications/context.js';
import type { EmailPayload } from '../notifications/email-templates.js';

type Decision = organisations.OrganisationDecision;

export type OrganisationDecisionNotice = (
  db: Db,
  decided: {
    readonly organisation: Organization;
    readonly decision: Decision;
    readonly note: string | null;
  },
) => Promise<void>;

const WORDING: Record<
  Decision,
  readonly [
    subject: typeof email_org_decision_approved_subject,
    line: typeof email_org_decision_approved,
  ]
> = {
  approve: [email_org_decision_approved_subject, email_org_decision_approved],
  reject: [email_org_decision_rejected_subject, email_org_decision_rejected],
  suspend: [email_org_decision_suspended_subject, email_org_decision_suspended],
  reinstate: [
    email_org_decision_reinstated_subject,
    email_org_decision_reinstated,
  ],
};

/** The email telling an owner what was decided about their organisation, with the note if any. */
export const renderOrganisationDecisionEmail = async (
  locale: Locale,
  values: {
    readonly organisation: string;
    readonly decision: Decision;
    readonly note: string | null;
  },
): Promise<EmailPayload> => {
  const options = { locale };
  const [subjectOf, lineOf] = WORDING[values.decision];
  const names = { organisation: values.organisation };
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
 * Tell each owner of an organisation what an operator decided (B-ORG-06), in the language each
 * chose, else the market's. Best effort: the decision is already written, so a failed or impossible
 * send is logged by organisation id and never thrown back to the operator.
 */
export const createDecisionNotice =
  (provider: EmailProvider | null): OrganisationDecisionNotice =>
  async (db, { organisation, decision, note }) => {
    const context = { organisationId: organisation.id, decision };
    if (!provider) {
      logger.error('organisation_decision_email_unbound', context);
      return;
    }
    const owners = await listOrganisationOwnerContacts(db, organisation.id);
    for (const owner of owners) {
      const { locale } = await resolveNotificationContext(db, {
        preferred: owner.localePref,
        marketCode: organisation.marketCode,
      });
      const email = await renderOrganisationDecisionEmail(locale, {
        organisation: organisation.name,
        decision,
        note,
      });
      const sent = await provider.send({ to: owner.email, ...email });
      if (!sent.ok)
        logger.error('organisation_decision_email_failed', {
          ...context,
          code: sent.error.code,
        });
    }
  };
