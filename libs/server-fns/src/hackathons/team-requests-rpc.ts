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
  answerTeamRequestResolver,
  cancelTeamRequestResolver,
  requestToJoinTeamResolver,
} from './team-requests.js';

const { hackathonTeamRequest, hackathonTeamRequestAnswer } = RATE_BUDGETS.edit;

const requestMiddleware = [
  requirePermission('team', 'join'),
  rateLimit(
    hackathonTeamRequest.action,
    hackathonTeamRequest.limit,
    hackathonTeamRequest.windowMs,
  ),
] as const;

/** Ask to join a team (B-TEAM-05). Authenticated, so no Turnstile. */
export const requestToJoinHackathonTeam = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...requestMiddleware])
  .validator(appValidator(hackathons.hackathonTeamRequestSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      requestToJoinTeamResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** Take back a pending request to join a team (B-TEAM-05). */
export const cancelHackathonTeamRequest = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...requestMiddleware])
  .validator(appValidator(hackathons.hackathonTeamRequestAnswerSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      cancelTeamRequestResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/**
 * Accept or decline a request to join the captain's team (B-TEAM-05). Whether the member captains
 * that team is the resolver's to decide.
 */
export const answerHackathonTeamRequest = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('team', 'create'),
    rateLimit(
      hackathonTeamRequestAnswer.action,
      hackathonTeamRequestAnswer.limit,
      hackathonTeamRequestAnswer.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.hackathonTeamRequestDecisionSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      answerTeamRequestResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
