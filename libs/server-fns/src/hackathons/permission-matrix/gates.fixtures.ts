import {
  authorizeOrganisationAction,
  createAuth,
  type AuthSession,
} from '@founders-coffee/auth';
import { AppError } from '@founders-coffee/core';
import { readHackathonLeadOrganisation, type Db } from '@founders-coffee/db';

import { getAuthEnv, resolveSession } from '../../auth.js';
import { requireAuth, requirePermission } from '../../authz.js';
import type { Gate } from './matrix.fixtures.js';
import type { CastMember, World } from './world.fixtures.js';

const { auth } = createAuth(getAuthEnv());

const sessions = new Map<string, AuthSession | null>();

const sessionOf = async (caller: CastMember): Promise<AuthSession | null> => {
  if (!sessions.has(caller.userId))
    sessions.set(caller.userId, await resolveSession(caller.headers));
  return sessions.get(caller.userId) ?? null;
};

/**
 * Pass or refuse one function's middleware gate, by the calls `auth-middleware.ts` makes.
 *
 * The middleware itself reads `getRequest()`, which only exists inside a server-function request, so
 * this holds the same steps in the same order against a real Better Auth session and real D1: the
 * session from the caller's cookie, then the role table for `requirePermission`, and the lead
 * organisation and `authorizeOrganisationAction` for the two organisation gates. A refusal throws
 * the `AppError` the caller receives. `completeness.test.ts` holds each operation's declared gate to
 * the middleware its function really composes.
 */
export const passGate = async (
  gate: Gate,
  db: Db,
  caller: CastMember,
  world: World,
): Promise<void> => {
  const session = await sessionOf(caller);
  if (gate.kind === 'permission') {
    requirePermission(session, gate.resource, gate.action);
    return;
  }
  if (gate.kind === 'organisation') {
    await authorizeOrganisationAction({
      auth,
      db,
      headers: caller.headers,
      session,
      organisationId: world.organisationId,
      resource: gate.resource,
      action: gate.action,
    });
    return;
  }
  requireAuth(session);
  const organisationId = await readHackathonLeadOrganisation(db, world.eventId);
  if (!organisationId)
    throw new AppError('event_not_found', 'No hackathon for this event');
  await authorizeOrganisationAction({
    auth,
    db,
    headers: caller.headers,
    session,
    organisationId,
    resource: 'hackathon',
    action: gate.action,
  });
};
