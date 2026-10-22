import { createServerFn } from '@tanstack/react-start';
import type { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { submitHackathonForReviewResolver } from './review.js';

const { hackathonEdit } = RATE_BUDGETS.edit;

export type SubmitHackathonForReviewRequest = z.input<
  typeof hackathons.hackathonSubmitSchema
>;

/** Send a hackathon to the reviewers, on the version the organiser saw (B-HKN-08). */
export const submitHackathonForReview = createServerFn({
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
  .validator(appValidator(hackathons.hackathonSubmitSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      submitHackathonForReviewResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });
