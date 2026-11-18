import { z } from 'zod';

import {
  HACKATHON_TEAM_DESCRIPTION_MAX,
  HACKATHON_TEAM_NAME_MAX,
  idSchema,
  type HackathonRegistrationStatus,
  type Result,
} from '@founders-coffee/core';

import { decideJoinTeam, type TeamMembership } from './teams.js';
import type { HackathonTimeline } from './timeline.js';

export const hackathonTeamCreateSchema = z.strictObject({
  eventId: idSchema,
  name: z.string().trim().min(1).max(HACKATHON_TEAM_NAME_MAX),
  description: z
    .string()
    .trim()
    .max(HACKATHON_TEAM_DESCRIPTION_MAX)
    .transform((value) => value || null)
    .nullable()
    .default(null),
  isLookingForMembers: z.boolean().default(false),
});

export type HackathonTeamCreateInput = z.input<
  typeof hackathonTeamCreateSchema
>;

/**
 * Decide whether a participant can start a team (B-TEAM-03), which makes them its captain.
 *
 * Starting a team is joining one of size zero, so the rules are joining's: teams can still change,
 * the participant holds a place rather than waiting for one or having withdrawn, and they are in
 * no team yet.
 */
export const decideCreateTeam = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly registration: HackathonRegistrationStatus | null;
  readonly membership: TeamMembership | null;
}): Result<true> =>
  decideJoinTeam({
    ...input,
    registration: input.registration === 'registered' ? 'registered' : null,
    teamSize: 0,
    limits: { min: 1, max: 1 },
  });
