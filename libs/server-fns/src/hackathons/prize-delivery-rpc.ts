import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  assignPrizeResolver,
  prizeDeliveryResolver,
  setPrizeDeliveryResolver,
} from './prize-delivery.js';

const { hackathonEdit } = RATE_BUDGETS.edit;

/** Who holds each prize and how its delivery stands, for the organisation that leads it (B-PRZ-02). */
export const getHackathonPrizeDelivery = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathons.prizeDeliveryViewSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(prizeDeliveryResolver(getDb(), data.eventId));
  });

/** Give a prize to an entry in the results, within the edit budget (B-PRZ-02). */
export const assignHackathonPrize = createServerFn({
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
  .validator(appValidator(hackathons.prizeAssignmentSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(assignPrizeResolver(getDb(), data));
  });

/** Record how a prize's delivery stands, within the edit budget (B-PRZ-02). */
export const setHackathonPrizeDelivery = createServerFn({
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
  .validator(appValidator(hackathons.prizeDeliverySchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(setPrizeDeliveryResolver(getDb(), data));
  });
