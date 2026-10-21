import {
  createCloudflareEmailProvider,
  type EmailProvider,
} from '@founders-coffee/email';

import { workerEnv } from './env.js';

/**
 * This request's email provider, through the Worker's `EMAIL` binding, or `null` when the Worker has
 * no binding or sender address, so a caller logs that nothing was sent instead of failing the action
 * the email reports on. Called only inside handlers: it reaches `cloudflare:workers`.
 */
export const emailProviderFromEnv = (): EmailProvider | null => {
  const env = workerEnv();
  return env.EMAIL && env.MAIL_FROM
    ? createCloudflareEmailProvider(env.EMAIL as SendEmail, env.MAIL_FROM)
    : null;
};
