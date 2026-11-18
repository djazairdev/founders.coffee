import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { setHackathonRecordShownResolver } from './hackathon-record.js';
import { PROFILE_UPDATE_LIMIT } from './schemas.js';

const hackathonRecordShownSchema = z.strictObject({ isShown: z.boolean() });

/** Show or hide the signed-in member's hackathon record on their profile (B-PRF-05). */
export const setHackathonRecordShown = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('profile', 'update'),
    rateLimit(
      PROFILE_UPDATE_LIMIT.action,
      PROFILE_UPDATE_LIMIT.limit,
      PROFILE_UPDATE_LIMIT.windowMs,
    ),
  ])
  .validator(appValidator(hackathonRecordShownSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      setHackathonRecordShownResolver(getDb(), {
        userId: requireAuth(context.session).user.id,
        isShown: data.isShown,
      }),
    );
  });
