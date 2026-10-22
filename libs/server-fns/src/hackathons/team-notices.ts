import type { HackathonTeamTemplateKey } from '@founders-coffee/core';
import {
  readTeamNoticeParties,
  type Db,
  type Event,
  type TeamNoticeParties,
} from '@founders-coffee/db';

import { syncDeadlineReminders } from '../notifications/hackathon-reminders.js';
import { enqueueHackathonTeamNotices } from '../notifications/hackathon-team.js';

type Members = TeamNoticeParties['members'];

type Notice = {
  readonly templateKey: HackathonTeamTemplateKey;
  readonly recipients: (members: Members) => readonly string[];
};

const membersBut = (members: Members, ...userIds: string[]) =>
  members
    .map((member) => member.userId)
    .filter((userId) => !userIds.includes(userId));

/**
 * Send the notices one team change earns, read once for all of them: the team's name and members
 * as the change left them, and the name of the member it is about.
 */
const notifyTeam = async (
  db: Db,
  event: Event,
  about: { readonly teamId: string; readonly userId: string },
  notices: readonly Notice[],
): Promise<void> => {
  const parties = await readTeamNoticeParties(db, about);
  if (!parties) return;
  for (const notice of notices)
    await enqueueHackathonTeamNotices(db, {
      templateKey: notice.templateKey,
      event,
      recipients: notice.recipients(parties.members),
      team: parties.teamName,
      name: parties.name,
    });
};

/** Tell the captain someone asks to join their team (B-TEAM-09). */
export const noticeTeamRequest = (
  db: Db,
  event: Event,
  input: { readonly teamId: string; readonly requesterId: string },
): Promise<void> =>
  notifyTeam(db, event, { teamId: input.teamId, userId: input.requesterId }, [
    {
      templateKey: 'hackathon_team_request',
      recipients: (members) =>
        members
          .filter((member) => member.isCaptain)
          .map((member) => member.userId),
    },
  ]);

/**
 * Tell a member how the captain answered their request (B-TEAM-09); once accepted, the rest of the
 * team also hears they joined, all but the captain who let them in.
 */
export const noticeTeamAnswer = (
  db: Db,
  event: Event,
  input: {
    readonly teamId: string;
    readonly requesterId: string;
    readonly captainId: string;
    readonly decision: 'accept' | 'decline';
  },
): Promise<void> =>
  notifyTeam(
    db,
    event,
    { teamId: input.teamId, userId: input.requesterId },
    input.decision === 'decline'
      ? [
          {
            templateKey: 'hackathon_team_declined',
            recipients: () => [input.requesterId],
          },
        ]
      : [
          {
            templateKey: 'hackathon_team_accepted',
            recipients: () => [input.requesterId],
          },
          {
            templateKey: 'hackathon_team_joined',
            recipients: (members) =>
              membersBut(members, input.requesterId, input.captainId),
          },
        ],
  );

/** Tell a team someone joined it from its invite link (B-TEAM-09). */
export const noticeTeamJoined = (
  db: Db,
  event: Event,
  input: { readonly teamId: string; readonly memberId: string },
): Promise<void> =>
  notifyTeam(db, event, { teamId: input.teamId, userId: input.memberId }, [
    {
      templateKey: 'hackathon_team_joined',
      recipients: (members) => membersBut(members, input.memberId),
    },
  ]);

/**
 * Tell a team a member is no longer in it (B-TEAM-09), whether they left or the captain removed
 * them; the captain who removed them is not told what they just did.
 */
export const noticeTeamLeft = (
  db: Db,
  event: Event,
  input: {
    readonly teamId: string;
    readonly memberId: string;
    readonly actorId: string;
  },
): Promise<void> =>
  notifyTeam(db, event, { teamId: input.teamId, userId: input.memberId }, [
    {
      templateKey: 'hackathon_team_left',
      recipients: (members) =>
        membersBut(members, input.memberId, input.actorId),
    },
  ]);

/**
 * Send every member of a team its receipt once the captain submitted its project (B-SUB-07), each
 * time they do, naming the project and who submitted it; and, the team having submitted, withdraw
 * their deadline reminders.
 */
export const noticeSubmissionReceived = async (
  db: Db,
  event: Event,
  input: {
    readonly teamId: string;
    readonly captainId: string;
    readonly project: string;
  },
): Promise<void> => {
  const parties = await readTeamNoticeParties(db, {
    teamId: input.teamId,
    userId: input.captainId,
  });
  if (!parties) return;
  const memberIds = parties.members.map((member) => member.userId);
  await enqueueHackathonTeamNotices(db, {
    templateKey: 'hackathon_submission_received',
    event,
    recipients: memberIds,
    team: parties.teamName,
    name: parties.name,
    project: input.project,
  });
  for (const userId of memberIds)
    await syncDeadlineReminders(db, { eventId: event.id, userId });
};
