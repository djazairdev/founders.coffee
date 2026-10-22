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
import { withdrawFromHackathonResolver } from './withdrawal.js';

const { hackathonRegister } = RATE_BUDGETS.edit;

/**
 * Withdraw the signed-in member from a hackathon (B-REG-04). It needs `hackathon:register`, like
 * registering, and shares its budget, so registering and withdrawing in turn cannot outrun it.
 */
export const withdrawFromHackathon = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('hackathon', 'register'),
    rateLimit(
      hackathonRegister.action,
      hackathonRegister.limit,
      hackathonRegister.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.hackathonWithdrawalSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      withdrawFromHackathonResolver(getDb(), workerMetrics(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
