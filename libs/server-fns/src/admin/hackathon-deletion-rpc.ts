import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  deleteHackathonResolver,
  searchHackathonsForDeletionResolver,
} from '../hackathons/deletion.js';
import { adminAccessSubject } from './access-subject.js';

const searchSchema = z.strictObject({
  query: z.string().trim().min(2).max(100),
});
const deleteSchema = z.strictObject({
  eventId: z.string().trim().min(1).max(64),
});

export type SearchHackathonsForDeletionRequest = z.input<typeof searchSchema>;
export type AdminDeleteHackathonRequest = z.input<typeof deleteSchema>;

export const findHackathonsForDeletion = createServerFn({ strict: false })
  .middleware([requirePermission('moderation', 'hackathon')])
  .validator(appValidator(searchSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(
      searchHackathonsForDeletionResolver(getDb(), data.query),
    );
  });

export const deleteAnyHackathon = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('moderation', 'hackathon'),
    limitedTo(RATE_BUDGETS.edit.hackathonDelete),
  ])
  .validator(appValidator(deleteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      deleteHackathonResolver(getDb(), {
        eventId: data.eventId,
        actorUserId: requireAuth(context.session).user.id,
        accessSubject: adminAccessSubject(getRequest().headers),
      }),
    );
  });
