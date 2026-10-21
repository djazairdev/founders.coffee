import type {
  OrganisationInvitationMail,
  OrganisationInvitationSender,
} from '@founders-coffee/auth';
import {
  getOrganisation,
  readLocalePrefByEmail,
  type Db,
} from '@founders-coffee/db';
import { renderEmail, type EmailProvider } from '@founders-coffee/email';
import { NotificationEmail } from '@founders-coffee/email/templates';
import {
  email_org_invitation_admin,
  email_org_invitation_cta,
  email_org_invitation_footer,
  email_org_invitation_greeting,
  email_org_invitation_member,
  email_org_invitation_members_can,
  email_org_invitation_preview,
  email_org_invitation_subject,
  type Locale,
} from '@founders-coffee/i18n';
import { logger } from '@founders-coffee/observability';

import {
  organisationInvitationUrlFor,
  resolveNotificationContext,
} from '../notifications/context.js';
import type { EmailPayload } from '../notifications/email-templates.js';

type InvitationEmailValues = {
  readonly organisation: string;
  readonly inviter: string;
  readonly role: string;
  readonly url: string;
};

/** The invitation email in one language: who invited, to what, as what, and the link to answer. */
export const renderInvitationEmail = async (
  locale: Locale,
  values: InvitationEmailValues,
): Promise<EmailPayload> => {
  const options = { locale };
  const names = { organisation: values.organisation, inviter: values.inviter };
  const subject = email_org_invitation_subject(names, options);
  const rendered = await renderEmail(NotificationEmail, {
    locale,
    preview: email_org_invitation_preview(names, options),
    greeting: email_org_invitation_greeting({}, options),
    lines: [
      values.role === 'admin'
        ? email_org_invitation_admin(names, options)
        : email_org_invitation_member(names, options),
      email_org_invitation_members_can({}, options),
    ],
    cta: { label: email_org_invitation_cta({}, options), href: values.url },
    footer: email_org_invitation_footer({}, options),
  });
  return { subject, html: rendered.html, text: rendered.text };
};

/**
 * Send an organisation invitation (B-ORG-05) through the email provider, in the invitee's language.
 *
 * That is the language a member with this address chose, else the organisation's market default,
 * the rule every notification follows; the inviter's own language says nothing about the person
 * invited. Better Auth calls this after the invitation is written and swallows what it throws, so a
 * failed or impossible send is logged here by the invitation's id, and the invitation stays pending for
 * an owner to send again. Without a provider, where the `EMAIL` binding is absent, nothing is sent.
 */
export const createInvitationSender =
  (db: Db, provider: EmailProvider | null): OrganisationInvitationSender =>
  async (mail: OrganisationInvitationMail) => {
    const context = { invitationId: mail.invitationId };
    if (!provider) {
      logger.error('organisation_invitation_email_unbound', context);
      return;
    }
    const organisation = await getOrganisation(db, mail.organisationId);
    if (!organisation) return;
    const { locale } = await resolveNotificationContext(db, {
      preferred: await readLocalePrefByEmail(db, mail.email),
      marketCode: organisation.marketCode,
    });
    const { subject, html, text } = await renderInvitationEmail(locale, {
      organisation: organisation.name,
      inviter: mail.inviterName,
      role: mail.role,
      url: organisationInvitationUrlFor(locale, mail.invitationId),
    });
    const sent = await provider.send({ to: mail.email, subject, html, text });
    if (!sent.ok) {
      logger.error('organisation_invitation_email_failed', {
        ...context,
        code: sent.error.code,
      });
      throw sent.error;
    }
    logger.info('organisation.invitation_sent', { ...context, locale });
  };
