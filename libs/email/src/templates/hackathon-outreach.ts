import {
  hackathon_outreach_email_body,
  hackathon_outreach_email_preview,
  hackathon_outreach_email_subject,
  type Locale,
} from '@founders-coffee/i18n';

import { renderEmail, type RenderedEmail } from '../render.js';
import type { EmailAddress } from '../provider.js';
import { NotificationEmail } from './notification.js';

const websiteUrl = 'https://founders.coffee';
const from: EmailAddress = {
  email: 'partnerships@founders.coffee',
  name: 'Founders Coffee Team',
};

export const renderHackathonOutreachEmail = async (
  locale: Locale = 'ar',
): Promise<
  RenderedEmail & {
    readonly from: EmailAddress;
    readonly subject: string;
    readonly replyTo: string;
  }
> => {
  const options = { locale };
  const subject = hackathon_outreach_email_subject({}, options);
  const rendered = await renderEmail(NotificationEmail, {
    locale,
    preview: hackathon_outreach_email_preview({}, options),
    bodyHtml: hackathon_outreach_email_body({ url: websiteUrl }, options),
  });

  return { from, subject, replyTo: from.email, ...rendered };
};
