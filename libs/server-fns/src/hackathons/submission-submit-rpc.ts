import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { workerMetrics } from '../env.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { submitSubmissionResolver } from './submission-submit.js';

const { hackathonSubmissionSubmit } = RATE_BUDGETS.edit;

/**
 * Submit the team's entry at the version the captain saw, before the deadline (B-SUB-04). Whether
 * the member captains a team is the resolver's to decide. Authenticated, so no Turnstile.
 */
export const submitHackathonSubmission = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('submission', 'create'),
    rateLimit(
      hackathonSubmissionSubmit.action,
      hackathonSubmissionSubmit.limit,
      hackathonSubmissionSubmit.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.submissionSubmitSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      submitSubmissionResolver(getDb(), workerMetrics(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
        version: data.version,
      }),
    );
  });
