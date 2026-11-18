import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  removeScreenshotResolver,
  reserveScreenshotResolver,
} from './screenshots.js';

const { screenshotReservation } = RATE_BUDGETS.expensive;
const { hackathonSubmissionSave } = RATE_BUDGETS.edit;

/** Claim a place for one screenshot on the team's entry (B-SUB-09). Authenticated, so no Turnstile. */
export const reserveHackathonScreenshot = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('submission', 'create'),
    rateLimit(
      screenshotReservation.action,
      screenshotReservation.limit,
      screenshotReservation.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.submissionScreenshotReserveSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      reserveScreenshotResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** Take a screenshot off the team's entry (B-SUB-09). Authenticated, so no Turnstile. */
export const removeHackathonScreenshot = createServerFn({
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
  .validator(appValidator(hackathons.submissionScreenshotRemoveSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      removeScreenshotResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
