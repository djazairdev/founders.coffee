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
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { invitationAuth } from './invitation-auth.js';
import {
  acceptInvitationResolver,
  cancelInvitationResolver,
  inviteMemberResolver,
  rejectInvitationResolver,
} from './invitations.js';

const {
  organisationInvite,
  organisationInvitationAnswer,
  organisationInvitationCancel,
} = RATE_BUDGETS.edit;

const invitationIdSchema = z.string().trim().min(1).max(128);

const inviteMemberSchema = organisations.organisationInvitationSchema.extend({
  organisationId: organisationIdSchema,
});

const cancelInvitationSchema = z.strictObject({
  organisationId: organisationIdSchema,
  invitationId: invitationIdSchema,
});

const answerInvitationSchema = z.strictObject({
  invitationId: invitationIdSchema,
});

export type InviteMemberRequest = z.input<typeof inviteMemberSchema>;
export type CancelInvitationRequest = z.input<typeof cancelInvitationSchema>;
export type AnswerInvitationRequest = z.input<typeof answerInvitationSchema>;

/** Invite someone to an organisation by email (B-ORG-05); owners and admins only. */
export const inviteOrganisationMember = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireOrganisationPermission('invitation', 'create'),
    rateLimit(
      organisationInvite.action,
      organisationInvite.limit,
      organisationInvite.windowMs,
    ),
  ])
  .validator(appValidator(inviteMemberSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    const { db, auth } = invitationAuth();
    return handleResult(
      inviteMemberResolver(db, auth, {
        headers: getRequest().headers,
        organisationId: context.organisationId,
        email: data.email,
        role: data.role,
      }),
    );
  });

/** Cancel a pending invitation of an organisation; owners and admins only. */
export const cancelOrganisationInvitation = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireOrganisationPermission('invitation', 'cancel'),
    rateLimit(
      organisationInvitationCancel.action,
      organisationInvitationCancel.limit,
      organisationInvitationCancel.windowMs,
    ),
  ])
  .validator(appValidator(cancelInvitationSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    const { db, auth } = invitationAuth();
    return handleResult(
      cancelInvitationResolver(db, auth, {
        headers: getRequest().headers,
        organisationId: context.organisationId,
        invitationId: data.invitationId,
      }),
    );
  });

/**
 * Accept an organisation invitation sent to the signed-in member's address. Joining asks what
 * applying for an organisation asks, `organisation:apply`, and shares one budget with declining.
 */
export const acceptOrganisationInvitation = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('organisation', 'apply'),
    rateLimit(
      organisationInvitationAnswer.action,
      organisationInvitationAnswer.limit,
      organisationInvitationAnswer.windowMs,
    ),
  ])
  .validator(appValidator(answerInvitationSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    const { db, auth } = invitationAuth();
    return handleResult(
      acceptInvitationResolver(db, auth, {
        headers: getRequest().headers,
        invitee: requireAuth(context.session).user,
        invitationId: data.invitationId,
      }),
    );
  });

/** Decline an organisation invitation sent to the signed-in member's address. */
export const rejectOrganisationInvitation = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('organisation', 'apply'),
    rateLimit(
      organisationInvitationAnswer.action,
      organisationInvitationAnswer.limit,
      organisationInvitationAnswer.windowMs,
    ),
  ])
  .validator(appValidator(answerInvitationSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    const { db, auth } = invitationAuth();
    return handleResult(
      rejectInvitationResolver(db, auth, {
        headers: getRequest().headers,
        invitee: requireAuth(context.session).user,
        invitationId: data.invitationId,
      }),
    );
  });
