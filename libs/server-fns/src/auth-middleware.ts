import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import {
  authorizeOrganisationAction,
  createAuth,
  type OrganisationAction,
  type OrganisationResource,
} from '@founders-coffee/auth';
import {
  AppError,
  appValidator,
  organisationIdSchema,
} from '@founders-coffee/core';
import { readHackathonLeadOrganisation } from '@founders-coffee/db';

import { getAuthEnv, resolveSession } from './auth.js';
import {
  requireAuth,
  requirePermission as enforcePermission,
  type PermissionAction,
  type PermissionResource,
} from './authz.js';
import { getDb } from './db.js';

/**
 * Attach the resolved session (null if anonymous) to the server-function context. Compose **per-fn**
 * that needs identity — NOT global, so public RPCs (e.g. the markets resolver) stay anonymous. Pairs
 * with {@link requirePermission} (the enforcer) on fns that touch private data.
 *
 * Kept in a separate module from [auth.ts](./auth.ts) because `@tanstack/react-start/server`
 * transitively loads `createStartHandler` (a vite-plugin virtual entry) which the vitest pool can't
 * resolve — so only this glue module carries that import; the pool-tested `resolveSession` stays clean.
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const session = await resolveSession(getRequest().headers);
    return next({ context: { session } });
  },
);

/**
 * Server-function middleware factory: require an authenticated session whose role is granted
 * `action` on `resource` (throws `AppError('unauthenticated'|'forbidden')` otherwise). Compose on the
 * data-boundary server-fn — `createServerFn().middleware([requirePermission('event', 'create')])` —
 * the data boundary itself, not just a route guard (AGENTS.md §10). Depends on {@link authMiddleware}
 * for `context.session`.
 */
export const requirePermission = (
  resource: PermissionResource,
  action: PermissionAction,
) =>
  createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .server(({ context, next }) => {
      enforcePermission(context.session, resource, action);
      return next();
    });

const organisationScopedInput = z.looseObject({
  organisationId: organisationIdSchema,
});

/**
 * Server-function middleware factory: require a signed-in member whose role in the organisation named
 * by the input's `organisationId` is granted `action` on `resource`, in an approved organisation
 * (B-ORG-02). The organisation-scoped twin of {@link requirePermission}: compose it on the data
 * boundary, `createServerFn().middleware([requireOrganisationPermission('hackathon', 'create')])`,
 * and keep `organisationId` in the function's own schema too. Its validator passes every other field
 * through, so that schema still sees the whole input. Throws `AppError('unauthenticated'|'forbidden'|
 * 'organisation_not_approved')`; the function's context carries the checked `organisationId`.
 */
export const requireOrganisationPermission = <R extends OrganisationResource>(
  resource: R,
  action: OrganisationAction<R>,
) =>
  createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .validator(appValidator(organisationScopedInput))
    .server(async ({ context, data, next }) => {
      const { auth } = createAuth(getAuthEnv());
      await authorizeOrganisationAction({
        auth,
        db: getDb(),
        headers: getRequest().headers,
        session: context.session,
        organisationId: data.organisationId,
        resource,
        action,
      });
      return next({ context: { organisationId: data.organisationId } });
    });

const hackathonScopedInput = z.looseObject({
  eventId: z.string().trim().min(1).max(64),
});

/**
 * Server-function middleware factory: require a signed-in member of the organisation that leads the
 * hackathon named by the input's `eventId`, whose role there is granted `action` on hackathons, in
 * an approved organisation. The hackathon twin of {@link requireOrganisationPermission}, for the
 * screens that start from a hackathon rather than an organisation: keep `eventId` in the function's
 * own schema too. An event that is not a hackathon an organisation leads answers `event_not_found`,
 * as one that does not exist; the context carries the checked `eventId` and `organisationId`.
 */
export const requireHackathonOrganiser = (
  action: OrganisationAction<'hackathon'>,
) =>
  createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .validator(appValidator(hackathonScopedInput))
    .server(async ({ context, data, next }) => {
      requireAuth(context.session);
      const db = getDb();
      const organisationId = await readHackathonLeadOrganisation(
        db,
        data.eventId,
      );
      if (!organisationId)
        throw new AppError('event_not_found', 'No hackathon for this event');
      const { auth } = createAuth(getAuthEnv());
      await authorizeOrganisationAction({
        auth,
        db,
        headers: getRequest().headers,
        session: context.session,
        organisationId,
        resource: 'hackathon',
        action,
      });
      return next({ context: { organisationId, eventId: data.eventId } });
    });
