import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { placeInviteResolver } from './place-invite.js';

export const getHackathonPlaceInvite = createServerFn({ strict: false })
  .middleware([requirePermission('hackathon', 'register')])
  .validator(appValidator(hackathons.hackathonPlaceInvitePreviewSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      placeInviteResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
