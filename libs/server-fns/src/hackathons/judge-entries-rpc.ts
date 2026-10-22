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
  listJudgeEntriesResolver,
  recuseFromEntryResolver,
} from './judge-entries.js';

const { hackathonRecusal } = RATE_BUDGETS.edit;

/**
 * The entries the signed-in judge reads (B-JDG-04). `judging:score` is every member's; whether
 * they judge this hackathon is the resolver's to decide.
 */
export const getHackathonJudgeEntries = createServerFn({ strict: false })
  .middleware([requirePermission('judging', 'score')])
  .validator(appValidator(hackathons.judgeEntriesSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      listJudgeEntriesResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/**
 * Recuse the signed-in judge from an entry with a reason (B-JDG-04), within a budget of its own.
 * Authenticated, so no Turnstile.
 */
export const recuseFromHackathonEntry = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('judging', 'score'),
    rateLimit(
      hackathonRecusal.action,
      hackathonRecusal.limit,
      hackathonRecusal.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.recusalSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      recuseFromEntryResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
