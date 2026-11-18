import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { teamPageResolver } from './team-page.js';

/** The signed-in member's team page for a hackathon (B-TEAM-07). */
export const getHackathonTeamPage = createServerFn({ strict: false })
  .middleware([requirePermission('team', 'join')])
  .validator(appValidator(hackathons.hackathonTeamInviteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      teamPageResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
