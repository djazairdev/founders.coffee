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
  leaveTeamResolver,
  passCaptaincyResolver,
  removeTeamMemberResolver,
} from './team-changes.js';

const { hackathonTeamChange } = RATE_BUDGETS.edit;

const budget = rateLimit(
  hackathonTeamChange.action,
  hackathonTeamChange.limit,
  hackathonTeamChange.windowMs,
);

/** Leave the member's team; a captain alone deletes it (B-TEAM-06). */
export const leaveHackathonTeam = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([requirePermission('team', 'join'), budget])
  .validator(appValidator(hackathons.hackathonTeamLeaveSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      leaveTeamResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/**
 * Hand the captain's team to another of its members (B-TEAM-06). Whether the member captains it is
 * the resolver's to decide.
 */
export const passHackathonTeamCaptaincy = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([requirePermission('team', 'create'), budget])
  .validator(appValidator(hackathons.hackathonTeamMemberSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      passCaptaincyResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** Remove another member from the captain's team (B-TEAM-06). */
export const removeHackathonTeamMember = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([requirePermission('team', 'create'), budget])
  .validator(appValidator(hackathons.hackathonTeamMemberSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      removeTeamMemberResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
