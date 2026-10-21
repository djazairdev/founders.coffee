import { isAPIError } from 'better-auth/api';

import { AppError } from '@founders-coffee/core';
import { readOrganisationMembership, type Db } from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';

import type { AuthInstance } from './auth.js';
import { requireSession, type AuthSession } from './middleware.js';
import type {
  OrganisationAction,
  OrganisationResource,
} from './organisation-access.js';

type OrganisationRequest<R extends OrganisationResource> = {
  auth: AuthInstance;
  db: Db;
  headers: Headers;
  session: AuthSession | null;
  organisationId: string;
  resource: R;
  action: OrganisationAction<R>;
};

/** Whether Better Auth refused a request, as opposed to failing on its own (a 4xx `APIError`). */
export const isAuthRefusal = (error: unknown): boolean =>
  isAPIError(error) && error.statusCode < 500;

const hasOrganisationPermission = async <R extends OrganisationResource>(
  request: OrganisationRequest<R>,
): Promise<boolean> => {
  try {
    const { success } = await request.auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: request.organisationId,
        permissions: { [request.resource]: [request.action] },
      },
    });
    return success;
  } catch (error) {
    if (isAuthRefusal(error)) return false;
    throw error;
  }
};

/**
 * Require that whoever is signed in may take this action for this organisation, and that the
 * organisation may act at all (B-ORG-02).
 *
 * Membership and status come from one read. Someone who is not a member, or names an organisation
 * that does not exist, is told only `forbidden`, so an outsider never learns an organisation's status;
 * refusing them here also keeps Better Auth from throwing for a non-member. The role is then asked of
 * Better Auth's `hasPermission`, against the organisation roles the plugin is given, the same table
 * its own member and invitation endpoints use. Last, a member is refused with
 * `organisation_not_approved` until an operator approves the organisation, and again once it is
 * rejected or suspended: an unapproved organisation can do nothing.
 */
export const authorizeOrganisationAction = async <
  R extends OrganisationResource,
>(
  request: OrganisationRequest<R>,
): Promise<AuthSession> => {
  const session = requireSession(request.session);
  const membership = await readOrganisationMembership(request.db, {
    organisationId: request.organisationId,
    userId: session.user.id,
  });
  if (!membership || !(await hasOrganisationPermission(request))) {
    throw new AppError(
      'forbidden',
      `Permission denied: ${request.resource}:${request.action}`,
    );
  }
  if (!organisations.isOrganisationActive(membership.status)) {
    throw new AppError(
      'organisation_not_approved',
      'This organisation is not approved',
    );
  }
  return session;
};
