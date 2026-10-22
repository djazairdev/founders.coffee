import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  hackathonDraftResolver,
  saveHackathonDetailsResolver,
} from './details.js';

const { hackathonEdit } = RATE_BUDGETS.edit;

const eventId = z.string().trim().min(1).max(64);

const hackathonDraftSchema = z.strictObject({ eventId });

const saveHackathonDetailsSchema = z.strictObject({
  eventId,
  details: hackathons.hackathonDetailsSchema,
});

export type HackathonDraftRequest = z.input<typeof hackathonDraftSchema>;
export type SaveHackathonDetailsRequest = z.input<
  typeof saveHackathonDetailsSchema
>;

/** A hackathon as its organisers manage it (B-HKN-12); members of the organisation that leads it only. */
export const getHackathonDraft = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathonDraftSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(hackathonDraftResolver(getDb(), data.eventId));
  });

/**
 * Save the organiser flow's second step (B-HKN-12). A member of the organisation that leads the
 * hackathon, within the edit budget; authenticated, so no Turnstile.
 */
export const saveHackathonDetails = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireHackathonOrganiser('manage'),
    rateLimit(
      hackathonEdit.action,
      hackathonEdit.limit,
      hackathonEdit.windowMs,
    ),
  ])
  .validator(appValidator(saveHackathonDetailsSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      saveHackathonDetailsResolver(getDb(), {
        eventId: data.eventId,
        organisationId: context.organisationId,
        details: data.details,
      }),
    );
  });
