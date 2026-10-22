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
import { createHackathonTeamResolver } from './team-creation.js';

const { hackathonTeamCreate } = RATE_BUDGETS.edit;

/**
 * Start a team in a hackathon, as its captain (B-TEAM-03). It needs `team:create`, which every
 * member holds, and has a budget of its own. Authenticated, so no Turnstile.
 */
export const createHackathonTeam = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('team', 'create'),
    rateLimit(
      hackathonTeamCreate.action,
      hackathonTeamCreate.limit,
      hackathonTeamCreate.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.hackathonTeamCreateSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      createHackathonTeamResolver(getDb(), workerMetrics(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
        name: data.name,
        description: data.description,
        isLookingForMembers: data.isLookingForMembers,
      }),
    );
  });
