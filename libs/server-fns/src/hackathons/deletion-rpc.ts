import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { deleteHackathonResolver } from './deletion.js';

const schema = z.strictObject({ eventId: z.string().trim().min(1).max(64) });

export type DeleteHackathonRequest = z.input<typeof schema>;

export const deleteOwnedHackathon = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireHackathonOrganiser('manage'),
    limitedTo(RATE_BUDGETS.edit.hackathonDelete),
  ])
  .validator(appValidator(schema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      deleteHackathonResolver(getDb(), {
        eventId: data.eventId,
        organisationId: context.organisationId,
        actorUserId: requireAuth(context.session).user.id,
        accessSubject: null,
      }),
    );
  });
