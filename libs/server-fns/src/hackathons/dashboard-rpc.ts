import { createServerFn } from '@tanstack/react-start';

import { z } from 'zod';

import { appValidator, handleResult, idSchema } from '@founders-coffee/core';

import { requireHackathonOrganiser } from '../auth-middleware.js';
import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { hackathonDashboardResolver } from './dashboard.js';
import {
  hackathonParticipantsResolver,
  hackathonTeamsResolver,
} from './participants.js';

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

/** Who registered for a hackathon, for the organisation that leads it (B-REG-08). */
export const getHackathonParticipants = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathonDashboardSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(hackathonParticipantsResolver(getDb(), data.eventId));
  });

/** A hackathon's teams and entries, for the organisation that leads it (B-OPS-02). */
export const getHackathonTeams = createServerFn({ strict: false })
  .middleware([requireHackathonOrganiser('manage')])
  .validator(appValidator(hackathonDashboardSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(hackathonTeamsResolver(getDb(), data.eventId));
  });
