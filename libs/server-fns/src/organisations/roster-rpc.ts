import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
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
import { invitationAuth } from './invitation-auth.js';
import { myOrganisationResolver, removeMemberResolver } from './roster.js';

const { organisationMemberRemove } = RATE_BUDGETS.edit;

const myOrganisationSchema = z.strictObject({
  slug: organisations.organisationSlugLookupSchema,
});

const removeMemberSchema = z.strictObject({
  organisationId: organisationIdSchema,
  memberId: z.string().trim().min(1).max(128),
});

export type MyOrganisationRequest = z.input<typeof myOrganisationSchema>;
export type RemoveMemberRequest = z.input<typeof removeMemberSchema>;

/** The signed-in member's own organisation by its slug: its review, members and invitations (B-ORG-09). */
export const getMyOrganisation = createServerFn({ strict: false })
  .middleware([requirePermission('profile', 'read')])
  .validator(appValidator(myOrganisationSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      myOrganisationResolver(getDb(), {
        userId: requireAuth(context.session).user.id,
        slug: data.slug,
      }),
    );
  });

/** Remove a member from an organisation (B-ORG-09); owners and admins only. */
export const removeOrganisationMember = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireOrganisationPermission('member', 'delete'),
    rateLimit(
      organisationMemberRemove.action,
      organisationMemberRemove.limit,
      organisationMemberRemove.windowMs,
    ),
  ])
  .validator(appValidator(removeMemberSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    const { db, auth } = invitationAuth();
    return handleResult(
      removeMemberResolver(db, auth, {
        headers: getRequest().headers,
        organisationId: context.organisationId,
        memberId: data.memberId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
