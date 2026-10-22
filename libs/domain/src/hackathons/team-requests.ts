import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  type HackathonRegistrationStatus,
  type HackathonTeamRequestStatus,
  type Result,
} from '@founders-coffee/core';

import {
  canChangeTeams,
  decideJoinTeam,
  type TeamMembership,
} from './teams.js';
import type { HackathonTimeline } from './timeline.js';

export const hackathonTeamRequestSchema = z.strictObject({
  eventId: idSchema,
  teamId: idSchema,
});

export const hackathonTeamRequestAnswerSchema = z.strictObject({
  eventId: idSchema,
  requestId: idSchema,
});

export const hackathonTeamRequestDecisionSchema =
  hackathonTeamRequestAnswerSchema.extend({
    decision: z.enum(['accept', 'decline']),
  });

export type HackathonTeamRequestDecision = z.infer<
  typeof hackathonTeamRequestDecisionSchema
>['decision'];

type Joiner = {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly registration: HackathonRegistrationStatus | null;
  readonly membership: TeamMembership | null;
  readonly teamSize: number;
  readonly teamMax: number;
};

const joining = (input: Joiner): Result<true> =>
  decideJoinTeam({
    timeline: input.timeline,
    now: input.now,
    registration: input.registration === 'registered' ? 'registered' : null,
    membership: input.membership,
    teamSize: input.teamSize,
    limits: { min: 1, max: input.teamMax },
  });

/**
 * Decide whether a participant can ask to join a team (B-TEAM-05): by joining's own rules, since
 * asking is for a place the captain can then give, and only once at a time.
 */
export const decideTeamRequest = (
  input: Joiner & { readonly hasPendingRequest: boolean },
): Result<true> => {
  const joinable = joining(input);
  if (!joinable.ok) return joinable;
  return input.hasPendingRequest
    ? err(
        new AppError(
          'team_request_exists',
          'You already asked to join this team',
        ),
      )
    : ok(true);
};

const requestNotFound = () =>
  err(new AppError('team_request_not_found', 'This request is no longer open'));

/**
 * Decide whether a captain can answer a request to join their team (B-TEAM-05): only the captain
 * of that team, only while it is pending and teams can still change, and accepting also needs
 * joining's rules to hold for the member who asked, the team's size among them.
 */
export const decideTeamRequestAnswer = (input: {
  readonly decision: HackathonTeamRequestDecision;
  readonly request: {
    readonly teamId: string;
    readonly status: HackathonTeamRequestStatus;
  };
  readonly actor: TeamMembership | null;
  readonly requester: Joiner;
}): Result<true> => {
  if (!canChangeTeams(input.requester.timeline, input.requester.now))
    return err(new AppError('teams_locked', 'Teams no longer change'));
  if (
    input.actor === null ||
    !input.actor.isCaptain ||
    input.actor.teamId !== input.request.teamId
  )
    return err(
      new AppError('not_team_captain', 'Only the captain answers requests'),
    );
  if (input.request.status !== 'pending') return requestNotFound();
  return input.decision === 'accept' ? joining(input.requester) : ok(true);
};

/** Decide whether a member can take back their request to join a team (B-TEAM-05). */
export const decideTeamRequestCancel = (input: {
  readonly request: {
    readonly userId: string;
    readonly status: HackathonTeamRequestStatus;
  };
  readonly userId: string;
}): Result<true> =>
  input.request.userId === input.userId && input.request.status === 'pending'
    ? ok(true)
    : requestNotFound();
