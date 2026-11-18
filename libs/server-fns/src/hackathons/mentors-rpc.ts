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
  answerMentorInviteResolver,
  createMentorInviteResolver,
  listMentorsResolver,
  removeMentorResolver,
  saveMentorNoteResolver,
} from './mentors.js';

const { hackathonEdit, hackathonMentorAnswer, hackathonMentorNote } =
  RATE_BUDGETS.edit;

const organiserMiddleware = [
  requireHackathonOrganiser('manage'),
  rateLimit(hackathonEdit.action, hackathonEdit.limit, hackathonEdit.windowMs),
] as const;

/** Every mentor's place in the hackathon, for the organisation that leads it (B-HKN-25). */
export const listHackathonMentors = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathons.hackathonMentorInviteSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(listMentorsResolver(getDb(), data.eventId));
  });

/**
 * Make an invite link for one mentor (B-HKN-25), within the edit budget. A member of the
 * organisation that leads the hackathon; authenticated, so no Turnstile.
 */
export const createHackathonMentorInvite = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...organiserMiddleware])
  .validator(appValidator(hackathons.hackathonMentorInviteSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      createMentorInviteResolver(getDb(), {
        eventId: data.eventId,
        userId: requireAuth(context.session).user.id,
        organisationId: context.organisationId,
      }),
    );
  });

/** Remove a mentor's place, or the link nobody answered (B-HKN-25). */
export const removeHackathonMentor = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...organiserMiddleware])
  .validator(appValidator(hackathons.hackathonMentorRemoveSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      removeMentorResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });

/**
 * Accept a mentor's invite link with what the member helps with, or decline it (B-HKN-25). It
 * needs `hackathon:register`, as taking part in a hackathon does, and has a budget of its own,
 * which also bounds guessing at tokens. Authenticated, so no Turnstile.
 */
export const answerHackathonMentorInvite = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('hackathon', 'register'),
    rateLimit(
      hackathonMentorAnswer.action,
      hackathonMentorAnswer.limit,
      hackathonMentorAnswer.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.hackathonMentorAnswerSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      answerMentorInviteResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** Change what the mentor helps with and their office hours (B-HKN-25). */
export const saveHackathonMentorNote = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('hackathon', 'register'),
    rateLimit(
      hackathonMentorNote.action,
      hackathonMentorNote.limit,
      hackathonMentorNote.windowMs,
    ),
  ])
  .validator(appValidator(hackathons.hackathonMentorNoteSaveSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      saveMentorNoteResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
