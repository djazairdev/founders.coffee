import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appValidator, handleResult, idSchema } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { hackathonVersionSchema } from './details-rpc.js';
import {
  addHackathonPrizeResolver,
  changeHackathonPrizeResolver,
  confirmHackathonPrizeResolver,
  removeHackathonPrizeResolver,
} from './prizes.js';
import { saveHackathonRubricResolver } from './rubric.js';
import { saveHackathonTracksResolver } from './tracks.js';

const { hackathonEdit } = RATE_BUDGETS.edit;

const editOf = {
  eventId: z.string().trim().min(1).max(64),
  version: hackathonVersionSchema,
};

const saveHackathonTracksSchema = z.strictObject({
  ...editOf,
  tracks: z
    .array(
      z.strictObject({
        id: idSchema.nullable(),
        track: hackathons.hackathonTrackSchema,
      }),
    )
    .min(1)
    .max(hackathons.HACKATHON_TRACK_LIMIT),
});

const saveHackathonRubricSchema = z.strictObject({
  ...editOf,
  criteria: z
    .array(
      z.strictObject({
        id: idSchema.nullable(),
        criterion: hackathons.hackathonCriterionSchema,
      }),
    )
    .min(hackathons.HACKATHON_CRITERIA_MIN)
    .max(hackathons.HACKATHON_CRITERIA_MAX),
});

const addHackathonPrizeSchema = z.strictObject({
  ...editOf,
  prize: hackathons.hackathonPrizeSchema,
});

const changeHackathonPrizeSchema = addHackathonPrizeSchema.extend({
  prizeId: idSchema,
});

const removeHackathonPrizeSchema = z.strictObject({
  ...editOf,
  prizeId: idSchema,
});

const confirmHackathonPrizeSchema = removeHackathonPrizeSchema.extend({
  note: hackathons.hackathonPrizeConfirmationSchema,
});

export type SaveHackathonTracksRequest = z.input<
  typeof saveHackathonTracksSchema
>;
export type SaveHackathonRubricRequest = z.input<
  typeof saveHackathonRubricSchema
>;
export type AddHackathonPrizeRequest = z.input<typeof addHackathonPrizeSchema>;
export type ChangeHackathonPrizeRequest = z.input<
  typeof changeHackathonPrizeSchema
>;
export type RemoveHackathonPrizeRequest = z.input<
  typeof removeHackathonPrizeSchema
>;
export type ConfirmHackathonPrizeRequest = z.input<
  typeof confirmHackathonPrizeSchema
>;

const editMiddleware = [
  requireHackathonOrganiser('manage'),
  rateLimit(hackathonEdit.action, hackathonEdit.limit, hackathonEdit.windowMs),
] as const;

/** Save a hackathon's tracks as the organiser's list, on the version they saw (B-HKN-07). */
export const saveHackathonTracks = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...editMiddleware])
  .validator(appValidator(saveHackathonTracksSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      saveHackathonTracksResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });

/** Save a hackathon's judging rubric, on the version the organiser saw (B-HKN-07). */
export const saveHackathonRubric = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...editMiddleware])
  .validator(appValidator(saveHackathonRubricSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      saveHackathonRubricResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });

/** Add an unconfirmed prize, on the version the organiser saw (B-HKN-07). */
export const addHackathonPrize = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...editMiddleware])
  .validator(appValidator(addHackathonPrizeSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      addHackathonPrizeResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });

/** Reword a prize, on the version the organiser saw (B-HKN-07, B-HKN-10). */
export const changeHackathonPrize = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...editMiddleware])
  .validator(appValidator(changeHackathonPrizeSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      changeHackathonPrizeResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });

/** Withdraw an unconfirmed prize, on the version the organiser saw (B-HKN-07). */
export const removeHackathonPrize = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...editMiddleware])
  .validator(appValidator(removeHackathonPrizeSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      removeHackathonPrizeResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });

/** Mark a prize confirmed, with a private note, on the version the organiser saw (B-HKN-10). */
export const confirmHackathonPrize = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([...editMiddleware])
  .validator(appValidator(confirmHackathonPrizeSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      confirmHackathonPrizeResolver(getDb(), {
        ...data,
        organisationId: context.organisationId,
      }),
    );
  });
