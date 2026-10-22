import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';

const { hackathonSubmissionSave } = RATE_BUDGETS.edit;

/**
 * Save the team's submission draft, on the version the captain saw (B-SUB-03). Whether the member
 * captains a team is the resolver's to decide. Authenticated, so no Turnstile.
 */
export const saveHackathonSubmissionDraft = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('submission', 'create'),
    rateLimit(
      hackathonSubmissionSave.action,
      hackathonSubmissionSave.limit,
      hackathonSubmissionSave.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.submissionDraftSaveSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      saveSubmissionDraftResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
