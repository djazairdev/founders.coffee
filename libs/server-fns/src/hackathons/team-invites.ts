import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  joinTeamByInvite,
  readParticipantStanding,
  readTeamInvite,
  replaceTeamInvite,
  revokeTeamInvites,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { hashSecretToken, newSecretToken } from '../secret-tokens.js';
import { loadTeamHackathon } from './team-context.js';

type Captain = { readonly eventId: string; readonly userId: string };

export type TeamInviteCreated = {
  readonly token: string;
  readonly expiresAt: number;
};

export type TeamJoined = {
  readonly eventId: string;
  readonly teamId: string;
};

/** Whether the member may manage their team's invite link, by the team rules (B-TEAM-04). */
const decideAsCaptain = async (
  db: Db,
  input: Captain,
  now: number,
): Promise<Result<{ readonly marketCode: string }>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const standing = await readParticipantStanding(db, input);
  const decided = hackathons.decideTeamInvite({
    timeline: loaded.data.timeline,
    now,
    membership: standing.membership,
  });
  return decided.ok
    ? ok({ marketCode: loaded.data.event.marketCode })
    : decided;
};

/**
 * Give the captain's team a new invite link for seven days (B-TEAM-04); the link it had stops
 * working, so a captain who shared it too widely starts again with this. The token is answered
 * once, here, and only its hash is kept.
 */
export const createTeamInviteResolver = async (
  db: Db,
  input: Captain,
  now: number = Date.now(),
): Promise<Result<TeamInviteCreated>> => {
  const decided = await decideAsCaptain(db, input, now);
  if (!decided.ok) return decided;
  const token = newSecretToken();
  const expiresAt = now + hackathons.TEAM_INVITE_LIFETIME_MS;
  const made = await replaceTeamInvite(db, {
    ...input,
    id: id('tinv'),
    tokenHash: await hashSecretToken(token),
    expiresAt: new Date(expiresAt),
  });
  if (!made) {
    const again = await decideAsCaptain(db, input, now);
    return again.ok
      ? err(new AppError('teams_locked', 'Teams no longer change'))
      : again;
  }
  logger.info('hackathon.team_invite_created', {
    eventId: input.eventId,
    marketCode: decided.data.marketCode,
  });
  return ok({ token, expiresAt: Math.floor(expiresAt / 1000) * 1000 });
};

/** Turn off the captain's team's invite link (B-TEAM-04), so nobody else joins through it. */
export const revokeTeamInviteResolver = async (
  db: Db,
  input: Captain,
  now: number = Date.now(),
): Promise<Result<{ readonly revoked: number }>> => {
  const decided = await decideAsCaptain(db, input, now);
  if (!decided.ok) return decided;
  const revoked = await revokeTeamInvites(db, input);
  logger.info('hackathon.team_invite_revoked', {
    eventId: input.eventId,
    marketCode: decided.data.marketCode,
    revoked,
  });
  return ok({ revoked });
};

const inviteInvalid = () =>
  err(new AppError('team_invite_invalid', 'This invite link no longer works'));

/**
 * Join the team an invite link is for (B-TEAM-04).
 *
 * The rules decide first, from the link and where the member stands: the link works, and joining's
 * own rules hold (`team_invite_invalid`, `teams_locked`, `not_registered`, `already_in_team`,
 * `team_full`). The write re-checks all of it in one atomic batch, which counts the team as it
 * adds the member; when something changed in between, the rules are asked again so the refusal
 * says why. A link nobody made answers as one that no longer works.
 */
export const joinTeamByInviteResolver = async (
  db: Db,
  input: { readonly token: string; readonly userId: string },
  now: number = Date.now(),
): Promise<Result<TeamJoined>> => {
  const tokenHash = await hashSecretToken(input.token);
  const decide = async (): Promise<
    Result<{
      readonly teamId: string;
      readonly eventId: string;
      readonly marketCode: string;
    }>
  > => {
    const invite = await readTeamInvite(db, tokenHash);
    if (!invite) return inviteInvalid();
    const loaded = await loadTeamHackathon(db, invite.eventId);
    if (!loaded.ok) return loaded;
    const standing = await readParticipantStanding(db, {
      eventId: invite.eventId,
      userId: input.userId,
    });
    const decided = hackathons.decideJoinByInvite({
      invite: {
        expiresAt: invite.expiresAt.getTime(),
        isRevoked: invite.revokedAt !== null,
      },
      timeline: loaded.data.timeline,
      now,
      registration: standing.status,
      membership: standing.membership,
      teamSize: invite.teamSize,
      teamMax: invite.teamMax,
    });
    return decided.ok
      ? ok({
          teamId: invite.teamId,
          eventId: invite.eventId,
          marketCode: loaded.data.event.marketCode,
        })
      : decided;
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const { teamId, eventId, marketCode } = decided.data;
  const joined = await joinTeamByInvite(db, {
    tokenHash,
    eventId,
    userId: input.userId,
  });
  if (!joined) {
    const again = await decide();
    return again.ok ? inviteInvalid() : again;
  }
  logger.info('hackathon.team_joined', { eventId, marketCode, via: 'invite' });
  return ok({ eventId, teamId });
};
