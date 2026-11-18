import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import {
  appValidator,
  handleResult,
  ORGANISATION_STATUSES,
  organisationIdSchema,
} from '@founders-coffee/core';
import { organisations } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { adminAccessSubject } from './access-subject.js';
import {
  decideOrganisationResolver,
  listOrganisationReviewQueueResolver,
} from './organisation-review.js';
import { decisionNoticeFromEnv } from './organisation-review-runtime.js';

const reviewQueueSchema = z.strictObject({
  status: z.enum(ORGANISATION_STATUSES),
  page: z.number().int().min(0).max(1000).default(0),
});

const decisionSchema = z.strictObject({
  organisationId: organisationIdSchema,
  decision: organisations.organisationDecisionSchema,
});

export type OrganisationReviewQueueRequest = z.input<typeof reviewQueueSchema>;
export type OrganisationDecisionRequest = z.input<typeof decisionSchema>;

/** The organisations in one status, for the operator's review queue (B-ORG-06). */
export const listOrganisationReviewQueue = createServerFn({ strict: false })
  .middleware([requirePermission('moderation', 'organisation')])
  .validator(appValidator(reviewQueueSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(
      listOrganisationReviewQueueResolver(getDb(), data.status, data.page),
    );
  });

/**
 * Approve, reject with a note, suspend or reinstate an organisation. Operators with
 * `moderation:organisation` only; each decision is audited with the operator's Access subject.
 */
export const decideOrganisationApplication = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('moderation', 'organisation'),
    limitedTo(RATE_BUDGETS.edit.organisationDecision),
  ])
  .validator(appValidator(decisionSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      decideOrganisationResolver(getDb(), decisionNoticeFromEnv(), {
        organisationId: data.organisationId,
        decision: data.decision,
        actorUserId: requireAuth(context.session).user.id,
        accessSubject: adminAccessSubject(getRequest().headers),
      }),
    );
  });
