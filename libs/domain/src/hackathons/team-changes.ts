import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  userIdSchema,
  type Result,
} from '@founders-coffee/core';

import { canChangeTeams, type TeamMembership } from './teams.js';
import type { HackathonTimeline } from './timeline.js';

export const hackathonTeamLeaveSchema = z.strictObject({ eventId: idSchema });

export const hackathonTeamMemberSchema = z.strictObject({
  eventId: idSchema,
  memberId: userIdSchema,
});

/**
 * Decide whether the captain can remove someone from their team (B-TEAM-06): only the captain,
 * only another member of the same team, and only while teams can still change. A captain who wants
 * out passes the captaincy on and leaves.
 */
export const decideRemoveMember = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly actor: TeamMembership | null;
  readonly member: TeamMembership | null;
}): Result<true> => {
  if (!canChangeTeams(input.timeline, input.now))
    return err(new AppError('teams_locked', 'Teams no longer change'));
  if (input.actor === null || !input.actor.isCaptain)
    return err(
      new AppError('not_team_captain', 'Only the captain removes members'),
    );
  if (
    input.member === null ||
    input.member.teamId !== input.actor.teamId ||
    input.member.isCaptain
  )
    return err(
      new AppError('not_team_member', 'Only another member can be removed'),
    );
  return ok(true);
};
