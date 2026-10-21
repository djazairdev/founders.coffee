import { createAuth } from '@founders-coffee/auth';

import { getAuthEnv } from '../auth.js';
import { getDb } from '../db.js';
import { emailProviderFromEnv } from '../email-from-env.js';
import { createInvitationSender } from './invitation-email.js';

/**
 * The auth instance for one invitation request, sending its email through the `EMAIL` binding.
 * Without the binding the invitation is still written, and the sender logs that nothing was sent.
 *
 * Its own module, called only inside the handlers, because it reaches `cloudflare:workers`, which
 * the browser bundle must never import.
 */
export const invitationAuth = () => {
  const db = getDb();
  const provider = emailProviderFromEnv();
  return {
    db,
    auth: createAuth(getAuthEnv(), {
      sendInvitationEmail: createInvitationSender(db, provider),
    }).auth,
  };
};
