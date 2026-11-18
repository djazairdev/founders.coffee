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
  createTeamInviteResolver,
  joinTeamByInviteResolver,
  revokeTeamInviteResolver,
} from './team-invites.js';

const { hackathonTeamInvite, hackathonTeamJoin } = RATE_BUDGETS.edit;

const inviteMiddleware = [
  requirePermission('team', 'create'),
  rateLimit(
    hackathonTeamInvite.action,
    hackathonTeamInvite.limit,
    hackathonTeamInvite.windowMs,
  ),
] as const;

/**
 * Give the captain's team a new seven-day invite link, turning off the one it had (B-TEAM-04).
 * Whether the member captains a team is the resolver's to decide.
 */
export const createHackathonTeamInvite = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...inviteMiddleware])
  .validator(appValidator(hackathons.hackathonTeamInviteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      createTeamInviteResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** Turn off the captain's team's invite link (B-TEAM-04). */
export const revokeHackathonTeamInvite = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...inviteMiddleware])
  .validator(appValidator(hackathons.hackathonTeamInviteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      revokeTeamInviteResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/**
 * Join a team through its invite link (B-TEAM-04). It needs `team:join`, which every member holds,
 * and has a budget of its own, which also bounds guessing at tokens. Authenticated, so no Turnstile.
 */
export const joinHackathonTeam = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('team', 'join'),
    rateLimit(
      hackathonTeamJoin.action,
      hackathonTeamJoin.limit,
      hackathonTeamJoin.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.hackathonTeamJoinSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      joinTeamByInviteResolver(getDb(), {
        token: data.token,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
