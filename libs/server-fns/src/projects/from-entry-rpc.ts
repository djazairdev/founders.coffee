import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appValidator, handleResult, idSchema } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { workerMetrics } from '../env.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  confirmProjectListingResolver,
  createProjectFromEntryResolver,
  publishProjectResolver,
} from './from-entry.js';

const { projectFromEntry } = RATE_BUDGETS.edit;
const projectRefSchema = z.strictObject({ projectId: idSchema });

const withinBudget = rateLimit(
  projectFromEntry.action,
  projectFromEntry.limit,
  projectFromEntry.windowMs,
);

/** Make a draft project from the captain's team's entry (B-PRJ-02); authenticated, so no Turnstile. */
export const createHackathonProject = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([requirePermission('team', 'join'), withinBudget])
  .validator(appValidator(hackathons.hackathonTeamInviteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      createProjectFromEntryResolver(getDb(), workerMetrics(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** The member confirms they want to be listed on their team's project (B-PRJ-02). */
export const confirmHackathonProject = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([requirePermission('team', 'join'), withinBudget])
  .validator(appValidator(projectRefSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      confirmProjectListingResolver(getDb(), {
        projectId: data.projectId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** The owner publishes their team's draft project (B-PRJ-02). */
export const publishHackathonProject = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([requirePermission('team', 'join'), withinBudget])
  .validator(appValidator(projectRefSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      publishProjectResolver(getDb(), workerMetrics(), {
        projectId: data.projectId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
