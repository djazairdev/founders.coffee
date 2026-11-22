import {
  createCloudflareEmailProvider,
  type EmailProvider,
} from '@founders-coffee/email';

import { workerEnv } from './env.js';

const providerFromBinding = (
  binding: unknown,
  mailFrom: string | undefined,
): EmailProvider | null =>
  binding && mailFrom
    ? createCloudflareEmailProvider(binding as SendEmail, mailFrom)
    : null;

/**
 * This request's email provider, through the Worker's `EMAIL` binding, or `null` when the Worker has
 * no binding or sender address, so a caller logs that nothing was sent instead of failing the action
 * the email reports on. Called only inside handlers: it reaches `cloudflare:workers`.
 */
export const emailProviderFromEnv = (): EmailProvider | null => {
  const env = workerEnv();
  return providerFromBinding(env.EMAIL, env.MAIL_FROM);
};

export const outreachEmailProviderFromEnv = (): EmailProvider | null => {
  const env = workerEnv();
  return providerFromBinding(env.OUTREACH_EMAIL ?? env.EMAIL, env.MAIL_FROM);
};
