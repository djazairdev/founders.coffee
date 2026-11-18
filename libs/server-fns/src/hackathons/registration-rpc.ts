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
import { registerForHackathonResolver } from './registration.js';

const { hackathonRegister } = RATE_BUDGETS.edit;

/**
 * Register the signed-in member for a hackathon (B-REG-03). It needs `hackathon:register`, which
 * every member holds, and has a budget of its own. Authenticated, so no Turnstile.
 */
export const registerForHackathon = createServerFn({
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
  .validator(appValidator(hackathons.hackathonRegistrationSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      registerForHackathonResolver(getDb(), workerMetrics(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
        attendanceMode: data.attendanceMode,
        isAgeAttested: data.isAgeAttested,
        isLookingForTeam: data.isLookingForTeam,
        skills: data.skills,
      }),
    );
  });
