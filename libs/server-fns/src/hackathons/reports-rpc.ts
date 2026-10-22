import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { reportHackathonTargetResolver } from './reports.js';

/**
 * Report an entry or a team of a hackathon with a reason (B-SAFE-01), within a budget of its own.
 * Authenticated, so no Turnstile.
 */
export const reportHackathonTarget = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('hackathon_report', 'create'),
    limitedTo(RATE_BUDGETS.edit.hackathonReport),
  ])
  .validator(appValidator(hackathons.hackathonReportSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      reportHackathonTargetResolver(getDb(), {
        ...data,
        reporterId: requireAuth(context.session).user.id,
      }),
    );
  });
