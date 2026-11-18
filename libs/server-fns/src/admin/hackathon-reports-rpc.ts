import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import type { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { adminAccessSubject } from './access-subject.js';
import {
  decideReportResolver,
  listReportQueueResolver,
} from './hackathon-reports.js';

export type ReportQueueRequest = z.input<typeof hackathons.reportQueueSchema>;
export type ReportDecisionRequest = z.input<
  typeof hackathons.reportDecisionSchema
>;

/** The reported entries and teams waiting for a decision, for the operator's queue (B-SAFE-02). */
export const listHackathonReportQueue = createServerFn({ strict: false })
  .middleware([requirePermission('moderation', 'submission')])
  .validator(appValidator(hackathons.reportQueueSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(listReportQueueResolver(getDb(), data.page));
  });

/**
 * Dismiss a reported entry or team, or disqualify its team with a reason and evidence (B-SAFE-02).
 * Operators with `moderation:submission` only; each decision is audited with the operator's Access
 * subject.
 */
export const decideHackathonReport = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('moderation', 'submission'),
    limitedTo(RATE_BUDGETS.edit.hackathonReportDecision),
  ])
  .validator(appValidator(hackathons.reportDecisionSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      decideReportResolver(getDb(), {
        decision: data,
        actorUserId: requireAuth(context.session).user.id,
        accessSubject: adminAccessSubject(getRequest().headers),
      }),
    );
  });
