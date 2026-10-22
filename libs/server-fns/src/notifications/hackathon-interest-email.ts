import type { Db, Event, Hackathon } from '@founders-coffee/db';
import {
  ntf_email_hackathon_interest_html,
  ntf_email_hackathon_interest_subject,
  ntf_email_hackathon_interest_text,
  type Locale,
} from '@founders-coffee/i18n';

import { eventUrlFor, resolveNotificationContext } from './context.js';
import {
  renderNotificationEmail,
  type EmailPayload,
} from './email-templates.js';
import { dateFor } from './producer.js';
import { escapeHtml } from './templates.js';

export type InterestHackathon = {
  readonly event: Event;
  readonly hackathon: Hackathon;
};

/**
 * The registration notice for one hackathon in one language: its name, until when registration
 * stays open on the market's clock, and the link to its page, built by the helpers every other
 * notification uses.
 */
const renderHackathonInterestEmail = async (
  db: Db,
  { event, hackathon }: InterestHackathon,
  locale: Locale,
): Promise<EmailPayload> => {
  const context = await resolveNotificationContext(db, {
    preferred: locale,
    marketCode: event.marketCode,
  });
  const values = {
    title: event.title,
    date: dateFor(hackathon.registrationClosesAt.toISOString(), context, true),
    url: eventUrlFor({
      locale,
      marketSlug: context.marketSlug,
      eventSlug: event.slug,
    }),
  };
  const escaped = {
    title: escapeHtml(values.title),
    date: escapeHtml(values.date),
    url: escapeHtml(values.url),
  };
  const options = { locale };
  return renderNotificationEmail(
    locale,
    ntf_email_hackathon_interest_subject(values, options),
    ntf_email_hackathon_interest_html(escaped, options),
    ntf_email_hackathon_interest_text(values, options),
  );
};

/**
 * The notice a market's interest list was promised (B-ANN-05), rendered at most once per language.
 *
 * Nothing in it is personal, so a round renders it once per language rather than once per address.
 * The cache lives as long as the returned function, one pass.
 */
export const hackathonInterestEmails = (
  db: Db,
  found: InterestHackathon,
): ((locale: Locale) => Promise<EmailPayload>) => {
  const rendered = new Map<Locale, Promise<EmailPayload>>();
  return (locale) => {
    const cached = rendered.get(locale);
    if (cached) return cached;
    const email = renderHackathonInterestEmail(db, found, locale);
    rendered.set(locale, email);
    return email;
  };
};
