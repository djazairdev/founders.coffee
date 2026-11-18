import { z } from 'zod';

import {
  AppError,
  err,
  ok,
  type RegistrationStatus,
  type Result,
} from '@founders-coffee/core';

import type { HackathonTimeline } from './timeline.js';

export const TEAM_SIZE_CEILING = 10;

export const teamSizeLimitsSchema = z
  .strictObject({
    min: z.number().int().min(1).max(TEAM_SIZE_CEILING),
    max: z.number().int().min(1).max(TEAM_SIZE_CEILING),
  })
  .refine((limits) => limits.min <= limits.max, {
    path: ['max'],
    message: 'The largest team cannot be smaller than the smallest',
  });

export type TeamSizeLimits = z.infer<typeof teamSizeLimitsSchema>;

export type TeamMembership = {
  readonly teamId: string;
  readonly isCaptain: boolean;
};

const refuse = (code: string, message: string) =>
  err(new AppError(code, message));

/**
 * Whether teams can still change at `now`.
 *
 * Teams form, grow and shrink until the submission deadline, because the team is what submits; after
 * it, every entry has to stay with the people who built it, for judging and for the certificates.
 */
export const canChangeTeams = (
  timeline: HackathonTimeline,
  now: number,
): boolean => now < timeline.submissionDeadlineAt;

/** Whether a team of `size` people fits the hackathon's limits, as checked when it submits. */
export const isTeamSizeAllowed = (
  size: number,
  limits: TeamSizeLimits,
): boolean => size >= limits.min && size <= limits.max;

/**
 * Decide whether a participant can join a team, or create one, which joins them to it.
 *
 * Only a registered participant takes part, not one on the waitlist. Each belongs to one team per
 * hackathon, so joining another means leaving theirs first. A new team starts at size zero; joining
 * is refused once the team holds the most people the hackathon allows.
 */
export const decideJoinTeam = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly registration: RegistrationStatus | null;
  readonly membership: TeamMembership | null;
  readonly teamSize: number;
  readonly limits: TeamSizeLimits;
}): Result<true> => {
  if (!canChangeTeams(input.timeline, input.now))
    return refuse('teams_locked', 'Teams no longer change');
  if (input.registration !== 'registered')
    return refuse('not_registered', 'Only registered participants join teams');
  if (input.membership !== null)
    return refuse('already_in_team', 'A participant belongs to one team');
  if (input.teamSize >= input.limits.max)
    return refuse('team_full', `A team holds at most ${input.limits.max}`);
  return ok(true);
};

/**
 * Decide whether a member can leave their team.
 *
 * A captain hands the team on first, so a team is never left without one; the last member can leave,
 * which leaves the team empty.
 */
export const decideLeaveTeam = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly membership: TeamMembership | null;
  readonly teamSize: number;
}): Result<true> => {
  if (!canChangeTeams(input.timeline, input.now))
    return refuse('teams_locked', 'Teams no longer change');
  if (input.membership === null)
    return refuse('not_team_member', 'Only a member leaves a team');
  if (input.membership.isCaptain && input.teamSize > 1)
    return refuse(
      'captain_must_transfer',
      'The captain hands the team on before leaving',
    );
  return ok(true);
};

/**
 * Decide whether the captain can hand the team to another of its members.
 *
 * Only the captain hands it on, and only to someone else already in the same team.
 */
export const decideCaptainTransfer = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly actor: TeamMembership | null;
  readonly successor: TeamMembership | null;
}): Result<true> => {
  if (!canChangeTeams(input.timeline, input.now))
    return refuse('teams_locked', 'Teams no longer change');
  if (input.actor === null || !input.actor.isCaptain)
    return refuse('not_team_captain', 'Only the captain hands the team on');
  if (
    input.successor === null ||
    input.successor.teamId !== input.actor.teamId ||
    input.successor.isCaptain
  )
    return refuse(
      'not_team_member',
      'The new captain must be another member of the team',
    );
  return ok(true);
};
