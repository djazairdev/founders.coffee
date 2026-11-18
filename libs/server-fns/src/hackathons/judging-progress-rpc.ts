import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  judgingProgressResolver,
  remindJudgesResolver,
} from './judging-progress.js';

const { hackathonEdit } = RATE_BUDGETS.edit;

/** How far each judge has got, for the organisation that leads the hackathon (B-JDG-08). */
export const getHackathonJudgingProgress = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathons.hackathonResultsSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(judgingProgressResolver(getDb(), data.eventId));
  });

/**
 * Remind the judges with scores missing (B-JDG-08), within the edit budget. A member of the
 * organisation that leads the hackathon; authenticated, so no Turnstile.
 */
export const remindHackathonJudges = createServerFn({
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
  .validator(appValidator(hackathons.hackathonResultsSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(remindJudgesResolver(getDb(), data.eventId));
  });
