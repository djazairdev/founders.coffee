import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { saveHackathonDetailsResolver } from './details.js';
import { hackathonDraftResolver } from './draft-view.js';

const { hackathonEdit } = RATE_BUDGETS.edit;

const eventId = z.string().trim().min(1).max(64);

export const hackathonVersionSchema = z.number().int().positive();

const hackathonDraftSchema = z.strictObject({ eventId });

const saveHackathonDetailsSchema = z.strictObject({
  eventId,
  version: hackathonVersionSchema,
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
 * Save a hackathon's details (B-HKN-12), on the version the organiser saw (B-HKN-07). A member of the organisation that leads the
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
        version: data.version,
        organisationId: context.organisationId,
        details: data.details,
      }),
    );
  });
