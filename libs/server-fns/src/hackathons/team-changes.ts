import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  leaveTeam,
  passCaptaincy,
  readParticipantStanding,
  removeTeamMember,
  type Db,
  type Event,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { loadTeamHackathon } from './team-context.js';
import { noticeTeamLeft } from './team-notices.js';

type Member = { readonly eventId: string; readonly userId: string };

export type TeamLeft = { readonly isTeamDeleted: boolean };

const notTeamMember = () =>
  err(new AppError('not_team_member', 'The team changed in the meantime'));

/**
 * Run a team change: load the hackathon, decide by the team rules, write, and when the write found
 * things changed, decide again so the refusal says why (B-TEAM-06). A change the rules still allow
 * after a failed write was overtaken by another change to the team. Once the write lands, the team
 * is told what changed (B-TEAM-09).
 */
const runTeamChange = async <T>(
  db: Db,
  eventId: string,
  change: {
    readonly operation: string;
    readonly decide: (
      timeline: hackathons.HackathonTimeline,
    ) => Promise<Result<T>>;
    readonly write: (decided: T) => Promise<boolean>;
    readonly notify?: (decided: T, event: Event) => Promise<void>;
  },
): Promise<Result<T>> => {
  const loaded = await loadTeamHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  const decided = await change.decide(loaded.data.timeline);
  if (!decided.ok) return decided;
  if (!(await change.write(decided.data))) {
    const again = await change.decide(loaded.data.timeline);
    return again.ok ? notTeamMember() : again;
  }
  logger.info(change.operation, {
    eventId,
    marketCode: loaded.data.event.marketCode,
  });
  await change.notify?.(decided.data, loaded.data.event);
  return decided;
};

/**
 * Leave the member's team (B-TEAM-06). A captain passes the captaincy on first unless they are
 * alone, and then the team is deleted with them (`captain_must_transfer`).
 */
export const leaveTeamResolver = async (
  db: Db,
  input: Member,
  now: number = Date.now(),
): Promise<Result<TeamLeft>> => {
  const left = await runTeamChange(db, input.eventId, {
    operation: 'hackathon.team_left',
    decide: async (timeline) => {
      const standing = await readParticipantStanding(db, input);
      const decided = hackathons.decideLeaveTeam({
        timeline,
        now,
        membership: standing.membership,
        teamSize: standing.teamSize,
      });
      if (!decided.ok) return decided;
      if (!standing.membership) return notTeamMember();
      return ok({
        teamId: standing.membership.teamId,
        isTeamDeleted: standing.teamSize === 1,
      });
    },
    write: ({ teamId }) => leaveTeam(db, { ...input, teamId }),
    notify: async ({ teamId, isTeamDeleted }, event) => {
      if (!isTeamDeleted)
        await noticeTeamLeft(db, event, {
          teamId,
          memberId: input.userId,
          actorId: input.userId,
        });
    },
  });
  return left.ok ? ok({ isTeamDeleted: left.data.isTeamDeleted }) : left;
};

/** Hand the captain's team to another of its members (B-TEAM-06). */
export const passCaptaincyResolver = async (
  db: Db,
  input: Member & { readonly memberId: string },
  now: number = Date.now(),
): Promise<Result<true>> =>
  runTeamChange(db, input.eventId, {
    operation: 'hackathon.team_captaincy_passed',
    decide: async (timeline) => {
      const [actor, successor] = await Promise.all([
        readParticipantStanding(db, input),
        readParticipantStanding(db, { ...input, userId: input.memberId }),
      ]);
      return hackathons.decideCaptainTransfer({
        timeline,
        now,
        actor: actor.membership,
        successor: successor.membership,
      });
    },
    write: () =>
      passCaptaincy(db, {
        eventId: input.eventId,
        captainId: input.userId,
        successorId: input.memberId,
      }),
  });

/** Remove another member from the captain's team (B-TEAM-06). */
export const removeTeamMemberResolver = async (
  db: Db,
  input: Member & { readonly memberId: string },
  now: number = Date.now(),
): Promise<Result<true>> => {
  const removed = await runTeamChange(db, input.eventId, {
    operation: 'hackathon.team_member_removed',
    decide: async (timeline) => {
      const [actor, member] = await Promise.all([
        readParticipantStanding(db, input),
        readParticipantStanding(db, { ...input, userId: input.memberId }),
      ]);
      const decided = hackathons.decideRemoveMember({
        timeline,
        now,
        actor: actor.membership,
        member: member.membership,
      });
      if (!decided.ok) return decided;
      if (!actor.membership) return notTeamMember();
      return ok({ teamId: actor.membership.teamId });
    },
    write: () =>
      removeTeamMember(db, {
        eventId: input.eventId,
        captainId: input.userId,
        memberId: input.memberId,
      }),
    notify: ({ teamId }, event) =>
      noticeTeamLeft(db, event, {
        teamId,
        memberId: input.memberId,
        actorId: input.userId,
      }),
  });
  return removed.ok ? ok(true) : removed;
};
