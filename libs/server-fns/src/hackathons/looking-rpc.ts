import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { lookingForTeamResolver } from './looking.js';

/** The teams and participants looking for each other in a hackathon (B-TEAM-08). */
export const getHackathonLookingForTeam = createServerFn({ strict: false })
  .middleware([requirePermission('team', 'join')])
  .validator(appValidator(hackathons.hackathonTeamInviteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      lookingForTeamResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
