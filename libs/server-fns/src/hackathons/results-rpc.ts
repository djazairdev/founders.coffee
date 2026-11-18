import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { workerMetrics } from '../env.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  hackathonResultsResolver,
  publishHackathonResultsResolver,
} from './results.js';

const { hackathonEdit } = RATE_BUDGETS.edit;

/** Where a hackathon's results stand, for the organisation that leads it (B-JDG-09). */
export const getHackathonResults = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathons.hackathonResultsSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(hackathonResultsResolver(getDb(), data.eventId));
  });

/**
 * Publish a hackathon's results and freeze them (B-JDG-09), within the edit budget. A member of the
 * organisation that leads the hackathon; authenticated, so no Turnstile.
 */
export const publishHackathonResults = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireHackathonOrganiser('manage'),
    rateLimit(
      hackathonEdit.action,
      hackathonEdit.limit,
      hackathonEdit.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.publishResultsSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      publishHackathonResultsResolver(getDb(), workerMetrics(), {
        ...data,
        actorUserId: requireAuth(context.session).user.id,
      }),
    );
  });
