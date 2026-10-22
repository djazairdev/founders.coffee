import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import {
  requireHackathonOrganiser,
  requirePermission,
} from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  answerJudgeInviteResolver,
  createJudgeInviteResolver,
  listJudgesResolver,
  removeJudgeResolver,
} from './judges.js';

const { hackathonEdit, hackathonJudgeAnswer } = RATE_BUDGETS.edit;

const organiserMiddleware = [
  requireHackathonOrganiser('manage'),
  rateLimit(hackathonEdit.action, hackathonEdit.limit, hackathonEdit.windowMs),
] as const;

/** Every judge's place in the hackathon, for the organisation that leads it (B-JDG-03). */
export const listHackathonJudges = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathons.hackathonJudgeInviteSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(listJudgesResolver(getDb(), data.eventId));
  });

/**
 * Make an invite link for one judge (B-JDG-03), within the edit budget. A member of the
 * organisation that leads the hackathon; authenticated, so no Turnstile.
 */
export const createHackathonJudgeInvite = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...organiserMiddleware])
  .validator(appValidator(hackathons.hackathonJudgeInviteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      createJudgeInviteResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
        organisationId: context.organisationId,
      }),
    );
  });

/** Remove a judge's place, or the link nobody answered (B-JDG-03). */
export const removeHackathonJudge = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...organiserMiddleware])
  .validator(appValidator(hackathons.hackathonJudgeRemoveSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      removeJudgeResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });

/**
 * Accept or decline a judge's invite link (B-JDG-03). Accepting needs an account, so both answers
 * need `judging:score`, which every member holds, and share a budget of their own, which also
 * bounds guessing at tokens. Authenticated, so no Turnstile.
 */
export const answerHackathonJudgeInvite = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('judging', 'score'),
    rateLimit(
      hackathonJudgeAnswer.action,
      hackathonJudgeAnswer.limit,
      hackathonJudgeAnswer.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.hackathonJudgeAnswerSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      answerJudgeInviteResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
