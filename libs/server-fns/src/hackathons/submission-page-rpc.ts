import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { submissionPageResolver } from './submission-page.js';

/** The signed-in member's submission page for a hackathon (B-SUB-05). */
export const getHackathonSubmissionPage = createServerFn({ strict: false })
  .middleware([requirePermission('submission', 'create')])
  .validator(appValidator(hackathons.hackathonTeamInviteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      submissionPageResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
