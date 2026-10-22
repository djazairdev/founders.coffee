import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  acceptTeamRequest,
  cancelTeamRequest,
  createTeamRequest,
  declineTeamRequest,
  hasPendingTeamRequest,
  readParticipantStanding,
  readTeam,
  readTeamRequest,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { loadTeamHackathon } from './team-context.js';
import { noticeTeamAnswer, noticeTeamRequest } from './team-notices.js';

type Member = { readonly eventId: string; readonly userId: string };

const teamNotFound = () =>
  err(new AppError('team_not_found', 'No such team in this hackathon'));

const requestNotFound = () =>
  err(new AppError('team_request_not_found', 'This request is no longer open'));

/**
 * Ask to join a team (B-TEAM-05). The rules decide first, by joining's own (`teams_locked`,
 * `not_registered`, `already_in_team`, `team_full`) and once at a time (`team_request_exists`); the
 * write re-checks them, and when something changed in between they are asked again so the refusal
 * says why.
 */
export const requestToJoinTeamResolver = async (
  db: Db,
  input: Member & { readonly teamId: string },
  now: number = Date.now(),
): Promise<Result<{ readonly requestId: string }>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async (): Promise<Result<true>> => {
    const team = await readTeam(db, input);
    if (!team) return teamNotFound();
    const standing = await readParticipantStanding(db, input);
    return hackathons.decideTeamRequest({
      timeline: loaded.data.timeline,
      now,
      registration: standing.status,
      membership: standing.membership,
      teamSize: team.size,
      teamMax: team.teamMax,
      hasPendingRequest: await hasPendingTeamRequest(db, input),
    });
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const requestId = id('treq');
  if (!(await createTeamRequest(db, { ...input, id: requestId }))) {
    const again = await decide();
    return again.ok
      ? err(new AppError('teams_locked', 'Teams no longer change'))
      : again;
  }
  logger.info('hackathon.team_requested', {
    eventId: input.eventId,
    marketCode: loaded.data.event.marketCode,
  });
  await noticeTeamRequest(db, loaded.data.event, {
    teamId: input.teamId,
    requesterId: input.userId,
  });
  return ok({ requestId });
};

/**
 * Accept or decline a request to join the captain's team (B-TEAM-05). Accepting adds the member
 * only when they can still join, by an atomic write that counts the team as it adds them; when
 * the write finds things changed, the rules are asked again so the refusal says why.
 */
export const answerTeamRequestResolver = async (
  db: Db,
  input: Member & {
    readonly requestId: string;
    readonly decision: hackathons.HackathonTeamRequestDecision;
  },
  now: number = Date.now(),
): Promise<Result<{ readonly teamId: string }>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async (): Promise<
    Result<{ readonly teamId: string; readonly requesterId: string }>
  > => {
    const request = await readTeamRequest(db, input);
    if (!request) return requestNotFound();
    const team = await readTeam(db, request);
    if (!team) return requestNotFound();
    const [actor, requester] = await Promise.all([
      readParticipantStanding(db, input),
      readParticipantStanding(db, request),
    ]);
    const decided = hackathons.decideTeamRequestAnswer({
      decision: input.decision,
      request,
      actor: actor.membership,
      requester: {
        timeline: loaded.data.timeline,
        now,
        registration: requester.status,
        membership: requester.membership,
        teamSize: team.size,
        teamMax: team.teamMax,
      },
    });
    return decided.ok
      ? ok({ teamId: request.teamId, requesterId: request.userId })
      : decided;
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const answer = {
    eventId: input.eventId,
    requestId: input.requestId,
    captainId: input.userId,
  };
  const landed =
    input.decision === 'accept'
      ? await acceptTeamRequest(db, answer)
      : await declineTeamRequest(db, answer);
  if (!landed) {
    const again = await decide();
    return again.ok ? requestNotFound() : again;
  }
  logger.info(
    input.decision === 'accept'
      ? 'hackathon.team_joined'
      : 'hackathon.team_request_declined',
    {
      eventId: input.eventId,
      marketCode: loaded.data.event.marketCode,
      via: 'request',
    },
  );
  await noticeTeamAnswer(db, loaded.data.event, {
    teamId: decided.data.teamId,
    requesterId: decided.data.requesterId,
    captainId: input.userId,
    decision: input.decision,
  });
  return ok({ teamId: decided.data.teamId });
};

/** Take back the member's own pending request to join a team (B-TEAM-05). */
export const cancelTeamRequestResolver = async (
  db: Db,
  input: Member & { readonly requestId: string },
): Promise<Result<true>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const request = await readTeamRequest(db, input);
  if (!request) return requestNotFound();
  const decided = hackathons.decideTeamRequestCancel({
    request,
    userId: input.userId,
  });
  if (!decided.ok) return decided;
  if (!(await cancelTeamRequest(db, input))) return requestNotFound();
  logger.info('hackathon.team_request_cancelled', {
    eventId: input.eventId,
    marketCode: loaded.data.event.marketCode,
  });
  return ok(true);
};
