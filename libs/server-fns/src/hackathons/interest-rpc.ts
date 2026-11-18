import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  appValidator,
  handleResult,
  localeSchema,
  marketCodeSchema,
} from '@founders-coffee/core';

import { getDb } from '../db.js';
import { workerMetrics } from '../env.js';
import { rateLimit } from '../rate-limit.js';
import { requireHackathonInterestTurnstile } from '../turnstile/middleware.js';
import { joinHackathonInterestResolver } from './interest.js';

const joinHackathonInterestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  marketCode: marketCodeSchema,
  locale: localeSchema,
  turnstileToken: z.string().trim().max(2_048).optional(),
});

export type JoinHackathonInterestRequest = z.infer<
  typeof joinHackathonInterestSchema
>;

/**
 * Ask to hear when the first hackathon's registration opens. Public, with no session.
 *
 * Anonymous, state-changing and collecting an address, so it carries Turnstile, pinned to its own
 * action so a response minted on another form cannot be replayed here, and the same IP-scoped
 * budget as the city waitlist. The token is consumed by the middleware and never reaches the
 * resolver.
 */
export const joinHackathonInterest = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requireHackathonInterestTurnstile,
    rateLimit('join_hackathon_interest', 5, 600_000),
  ])
  .validator(appValidator(joinHackathonInterestSchema))
  .handler(async ({ data }) =>
    handleResult(
      joinHackathonInterestResolver(getDb(), workerMetrics(), {
        email: data.email,
        marketCode: data.marketCode,
        locale: data.locale,
      }),
    ),
  );
