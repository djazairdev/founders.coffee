import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import {
  emailProviderFromEnv,
  outreachEmailProviderFromEnv,
} from '../email-from-env.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { adminAccessSubject } from './access-subject.js';
import { sendHackathonDraftEmailResolver } from './hackathon-draft-email.js';

export type HackathonDraftEmailRequest = hackathons.HackathonDraftEmailInput;

/** Email a saved draft's creator to unblock the admin review queue (B-HKN-09). */
export const sendHackathonDraftEmail = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('moderation', 'hackathon'),
    limitedTo(RATE_BUDGETS.edit.hackathonDraftEmail),
  ])
  .validator(appValidator(hackathons.hackathonDraftEmailSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    const emailProvider =
      data.template === 'hackathon-outreach'
        ? outreachEmailProviderFromEnv()
        : emailProviderFromEnv();
    return handleResult(
      sendHackathonDraftEmailResolver(getDb(), emailProvider, data, {
        actorUserId: requireAuth(context.session).user.id,
        accessSubject: adminAccessSubject(getRequest().headers),
      }),
    );
  });
