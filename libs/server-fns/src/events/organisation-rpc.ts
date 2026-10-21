import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';

import {
  requireOrganisationPermission,
  requirePermission,
} from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { workerMetrics } from '../env.js';
import { getMapProvider } from '../maps/runtime.js';
import { rateLimit } from '../rate-limit.js';
import { requireEventCreateWafRule } from '../turnstile/middleware.js';
import { createEventWithTelemetry } from './create.js';
import { organisationEventCreateRequestSchema } from './schemas.js';

/**
 * Create an event as an organisation (B-EVT-17): the signed-in member hosts it, and the organisation
 * is named as its lead in the same batch as the event.
 *
 * Both checks run: `event:create` for the member, as `createEvent` asks, and `event:create` in
 * the approved organisation the input names. It shares the `create_event` bucket and the edge rule
 * with `createEvent`, so a member cannot double their creations by alternating the two. There
 * is no campaign attribution: an organisation's event is not created from a campaign landing.
 */
export const createOrganisationEvent = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('event', 'create'),
    requireOrganisationPermission('event', 'create'),
    rateLimit('create_event', 5, 600_000),
    requireEventCreateWafRule,
  ])
  .validator(appValidator(organisationEventCreateRequestSchema))
  .handler(async ({ context, data }) => {
    const session = requireAuth(context.session);
    return handleResult(
      createEventWithTelemetry(
        getDb(),
        getMapProvider(),
        workerMetrics(),
        session.user.id,
        data.event,
        undefined,
        context.organisationId,
      ),
    );
  });
