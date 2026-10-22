import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import {
  appValidator,
  handleResult,
  idSchema,
  organisationIdSchema,
} from '@founders-coffee/core';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { adminAccessSubject } from './access-subject.js';
import {
  addEventCoHostResolver,
  eventCoHostsResolver,
  removeEventCoHostResolver,
} from './event-cohosts.js';

const lookupSchema = z.strictObject({
  reference: z.string().trim().min(1).max(500),
});

const changeSchema = z.strictObject({
  eventId: idSchema,
  organisationId: organisationIdSchema,
});

export type EventCoHostsRequest = z.input<typeof lookupSchema>;
export type EventCoHostChangeRequest = z.input<typeof changeSchema>;

/** An event's organisers and the organisations that could co-host it, by its id or address (B-EVT-20). */
export const getEventCoHosts = createServerFn({ strict: false })
  .middleware([requirePermission('moderation', 'event')])
  .validator(appValidator(lookupSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(eventCoHostsResolver(getDb(), data.reference));
  });

/** Add a co-host organisation to an event, audited with the operator's Access subject. */
export const addEventCoHostOrganisation = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('moderation', 'event'),
    limitedTo(RATE_BUDGETS.edit.eventCoHost),
  ])
  .validator(appValidator(changeSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      addEventCoHostResolver(getDb(), data, {
        actorUserId: requireAuth(context.session).user.id,
        accessSubject: adminAccessSubject(getRequest().headers),
      }),
    );
  });

/** Take a co-host organisation off an event, audited with the operator's Access subject. */
export const removeEventCoHostOrganisation = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('moderation', 'event'),
    limitedTo(RATE_BUDGETS.edit.eventCoHost),
  ])
  .validator(appValidator(changeSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      removeEventCoHostResolver(getDb(), data, {
        actorUserId: requireAuth(context.session).user.id,
        accessSubject: adminAccessSubject(getRequest().headers),
      }),
    );
  });
