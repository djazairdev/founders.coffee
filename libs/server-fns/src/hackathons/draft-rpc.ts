import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  appValidator,
  handleResult,
  organisationIdSchema,
} from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireOrganisationPermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { getMapProvider } from '../maps/runtime.js';
import { rateLimit } from '../rate-limit.js';
import { requireEventCreateWafRule } from '../turnstile/middleware.js';
import { createHackathonDraftResolver } from './draft.js';

const createHackathonDraftSchema = z
  .object({
    organisationId: organisationIdSchema,
    hackathon: hackathons.hackathonBasicsSchema,
  })
  .strict();

export type CreateHackathonDraftRequest = z.infer<
  typeof createHackathonDraftSchema
>;

/**
 * Create a hackathon draft as an approved organisation (B-HKN-06), from its basics (B-HKN-11).
 *
 * The signed-in member needs `hackathon:create` in the organisation the input names; every role in
 * an approved organisation has it. A hackathon is an event, so it shares the `create_event` bucket
 * and the edge rule with the two ways of creating one, and a member cannot multiply their creations
 * by moving between them. Authenticated, so no Turnstile.
 */
export const createHackathonDraft = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireOrganisationPermission('hackathon', 'create'),
    rateLimit('create_event', 5, 600_000),
    requireEventCreateWafRule,
  ])
  .validator(appValidator(createHackathonDraftSchema))
  .handler(async ({ context, data }) => {
    const session = requireAuth(context.session);
    return handleResult(
      createHackathonDraftResolver(getDb(), getMapProvider(), {
        hostId: session.user.id,
        organisationId: context.organisationId,
        basics: data.hackathon,
      }),
    );
  });
