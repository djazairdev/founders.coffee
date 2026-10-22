import { createServerFn } from '@tanstack/react-start';

import { z } from 'zod';

import { appValidator, handleResult, idSchema } from '@founders-coffee/core';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { hackathonDashboardResolver } from './dashboard.js';

const hackathonDashboardSchema = z.strictObject({ eventId: idSchema });

export type HackathonDashboardRequest = z.input<
  typeof hackathonDashboardSchema
>;

/** A hackathon at a glance, for the organisation that leads it (B-OPS-01). */
export const getHackathonDashboard = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathonDashboardSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(hackathonDashboardResolver(getDb(), data.eventId));
  });
