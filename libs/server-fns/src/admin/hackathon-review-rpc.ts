import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { emailProviderFromEnv } from '../email-from-env.js';
import { workerMetrics } from '../env.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { adminAccessSubject } from './access-subject.js';
import { createHackathonDecisionNotice } from './hackathon-decision-email.js';
import {
  decideHackathonReviewResolver,
  listHackathonReviewQueueResolver,
} from './hackathon-review.js';

const reviewQueueSchema = z.strictObject({
  page: z.number().int().min(0).max(1000).default(0),
});

export type HackathonReviewQueueRequest = z.input<typeof reviewQueueSchema>;
export type HackathonDecisionRequest = z.input<
  typeof hackathons.hackathonReviewDecisionSchema
>;

/** The hackathons waiting for review, for the operator's queue (B-HKN-08). */
export const listHackathonReviewQueue = createServerFn({ strict: false })
  .middleware([requirePermission('moderation', 'hackathon')])
  .validator(appValidator(reviewQueueSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(listHackathonReviewQueueResolver(getDb(), data.page));
  });

/**
 * Approve a hackathon, which publishes it, or reject it with a note (B-HKN-08). Operators with
 * `moderation:hackathon` only; each decision is audited with the operator's Access subject.
 */
export const decideHackathonReviewDecision = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('moderation', 'hackathon'),
    limitedTo(RATE_BUDGETS.edit.hackathonDecision),
  ])
  .validator(appValidator(hackathons.hackathonReviewDecisionSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      decideHackathonReviewResolver(
        getDb(),
        createHackathonDecisionNotice(emailProviderFromEnv()),
        workerMetrics(),
        {
          decision: data,
          actorUserId: requireAuth(context.session).user.id,
          accessSubject: adminAccessSubject(getRequest().headers),
        },
      ),
    );
  });
