import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  listPullRequestsResolver,
  setPullRequestStatusResolver,
} from './pull-requests.js';

const { hackathonEdit } = RATE_BUDGETS.edit;

/** Every open-source entry's pull requests, for the organisation that leads the hackathon (B-SUB-08). */
export const getHackathonPullRequests = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathons.hackathonPullRequestsSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(listPullRequestsResolver(getDb(), data.eventId));
  });

/**
 * Record what maintainers did with one pull request (B-SUB-08), within the edit budget. A member
 * of the organisation that leads the hackathon; authenticated, so no Turnstile.
 */
export const setHackathonPullRequestStatus = createServerFn({
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
  .validator(appValidator(hackathons.pullRequestStatusChangeSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(setPullRequestStatusResolver(getDb(), data));
  });
