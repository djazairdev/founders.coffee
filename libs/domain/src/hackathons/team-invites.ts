import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  type HackathonRegistrationStatus,
  type Result,
} from '@founders-coffee/core';

import {
  canChangeTeams,
  decideJoinTeam,
  type TeamMembership,
} from './teams.js';
import type { HackathonTimeline } from './timeline.js';

export const TEAM_INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const hackathonTeamInviteSchema = z.strictObject({ eventId: idSchema });

export const hackathonTeamJoinSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

export type HackathonTeamJoinInput = z.infer<typeof hackathonTeamJoinSchema>;

/**
 * Decide whether a member can make or turn off their team's invite link (B-TEAM-04): only its
 * captain, and only while teams can still change.
 */
export const decideTeamInvite = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly membership: TeamMembership | null;
}): Result<true> => {
  if (!canChangeTeams(input.timeline, input.now))
    return err(new AppError('teams_locked', 'Teams no longer change'));
  if (input.membership === null || !input.membership.isCaptain)
    return err(
      new AppError('not_team_captain', 'Only the captain shares the team'),
    );
  return ok(true);
};

/**
 * Decide whether a member can join a team through its invite link (B-TEAM-04): the link still
 * works, then joining's own rules, so a registered participant in no team joins one with room.
 */
export const decideJoinByInvite = (input: {
  readonly invite: { readonly expiresAt: number; readonly isRevoked: boolean };
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly registration: HackathonRegistrationStatus | null;
  readonly membership: TeamMembership | null;
  readonly teamSize: number;
  readonly teamMax: number;
}): Result<true> => {
  if (input.invite.isRevoked || input.invite.expiresAt <= input.now)
    return err(
      new AppError('team_invite_invalid', 'This invite link no longer works'),
    );
  return decideJoinTeam({
    timeline: input.timeline,
    now: input.now,
    registration: input.registration === 'registered' ? 'registered' : null,
    membership: input.membership,
    teamSize: input.teamSize,
    limits: { min: 1, max: input.teamMax },
  });
};
