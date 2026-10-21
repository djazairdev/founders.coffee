import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  appValidator,
  handleResult,
  organisationIdSchema,
} from '@founders-coffee/core';
import { organisations } from '@founders-coffee/domain';

import {
  requireOrganisationPermission,
  requirePermission,
} from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  applyForOrganisationResolver,
  listMyOrganisationsResolver,
  updateOrganisationResolver,
} from './resolver.js';

const { organisationApply, organisationUpdate } = RATE_BUDGETS.edit;

const updateOrganisationSchema = z.strictObject({
  organisationId: organisationIdSchema,
  changes: organisations.organisationEditSchema,
});

export type ApplyForOrganisationRequest = z.input<
  typeof organisations.organisationApplicationSchema
>;
export type UpdateOrganisationRequest = z.input<
  typeof updateOrganisationSchema
>;

/** Apply for an organisation, which starts pending with the applicant as its owner (B-ORG-04). */
export const applyForOrganisation = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('organisation', 'apply'),
    rateLimit(
      organisationApply.action,
      organisationApply.limit,
      organisationApply.windowMs,
    ),
  ])
  .validator(appValidator(organisations.organisationApplicationSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      applyForOrganisationResolver(
        getDb(),
        requireAuth(context.session).user.id,
        data,
      ),
    );
  });

/** The organisations the signed-in member belongs to, with their role in each. */
export const listMyOrganisations = createServerFn({ strict: false })
  .middleware([requirePermission('profile', 'read')])
  .validator(appValidator(z.strictObject({})))
  .handler(({ context }) => {
    privateNoStore();
    return handleResult(
      listMyOrganisationsResolver(
        getDb(),
        requireAuth(context.session).user.id,
      ),
    );
  });

/** Change an approved organisation's public profile; owners and admins only. */
export const updateOrganisation = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireOrganisationPermission('organization', 'update'),
    rateLimit(
      organisationUpdate.action,
      organisationUpdate.limit,
      organisationUpdate.windowMs,
    ),
  ])
  .validator(appValidator(updateOrganisationSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      updateOrganisationResolver(getDb(), {
        organisationId: context.organisationId,
        userId: requireAuth(context.session).user.id,
        changes: data.changes,
      }),
    );
  });
