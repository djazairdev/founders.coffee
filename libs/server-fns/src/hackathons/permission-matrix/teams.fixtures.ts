import {
  leaveTeamResolver,
  passCaptaincyResolver,
  removeTeamMemberResolver,
} from '../team-changes.js';
import { createHackathonTeamResolver } from '../team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
  revokeTeamInviteResolver,
} from '../team-invites.js';
import { teamPageResolver } from '../team-page.js';
import {
  answerTeamRequestResolver,
  cancelTeamRequestResolver,
  requestToJoinTeamResolver,
} from '../team-requests.js';
import { lookingForTeamResolver } from '../looking.js';
import { registerForHackathonResolver } from '../registration.js';
import { withdrawFromHackathonResolver } from '../withdrawal.js';
import {
  everyone,
  everyoneBut,
  may,
  whilePublished,
  whileTeamsChange,
  selfOf,
  type Call,
  type Operations,
  type Row,
} from './matrix.fixtures.js';

const JOINING: Row = everyoneBut('not_registered', {
  registered: 'ok',
  captain: 'already_in_team',
  member: 'already_in_team',
});

const CAPTAIN_ONLY: Row = everyoneBut('not_team_captain', { captain: 'ok' });

const REGISTERED_ALREADY = {
  captain: 'already_registered',
  member: 'already_registered',
  registered: 'already_registered',
};

const WITHDRAWING: Row = everyoneBut('not_registered', {
  captain: 'captain_must_transfer',
  member: 'ok',
  registered: 'ok',
});

const WITHDRAWAL_CLOSED: Row = everyoneBut('not_registered', {
  captain: 'withdrawal_closed',
  member: 'withdrawal_closed',
  registered: 'withdrawal_closed',
});

/** The teammate a change names: the member, unless the member is the one asking. */
const teammate = ({ world, actor }: Call) =>
  world.cast[actor === 'member' ? 'captain' : 'member'].userId;

export const TEAM_OPERATIONS: Operations = {
  registerForHackathon: {
    gate: may('hackathon', 'register'),
    changesWorld: true,
    run: (call) =>
      registerForHackathonResolver(call.db, null, {
        ...selfOf(call),
        attendanceMode: 'online',
        isAgeAttested: false,
        isLookingForTeam: true,
        skills: null,
      }),
    cells: {
      ...whilePublished(everyone('registration_closed')),
      open: everyoneBut('ok', {
        ...REGISTERED_ALREADY,
        judge: 'already_judge',
      }),
    },
  },
  withdrawFromHackathon: {
    gate: may('hackathon', 'register'),
    changesWorld: true,
    run: (call) => withdrawFromHackathonResolver(call.db, null, selfOf(call)),
    cells: {
      ...whilePublished(WITHDRAWAL_CLOSED),
      open: WITHDRAWING,
      building: WITHDRAWING,
    },
  },
  createHackathonTeam: {
    gate: may('team', 'create'),
    changesWorld: true,
    run: (call) =>
      createHackathonTeamResolver(call.db, null, {
        ...selfOf(call),
        name: 'Second Team',
        description: null,
        isLookingForMembers: false,
      }),
    cells: whileTeamsChange(JOINING),
  },
  createHackathonTeamInvite: {
    gate: may('team', 'create'),
    changesWorld: true,
    run: (call) => createTeamInviteResolver(call.db, selfOf(call)),
    cells: whileTeamsChange(CAPTAIN_ONLY),
  },
  revokeHackathonTeamInvite: {
    gate: may('team', 'create'),
    changesWorld: true,
    run: (call) => revokeTeamInviteResolver(call.db, selfOf(call)),
    cells: whileTeamsChange(CAPTAIN_ONLY),
  },
  joinHackathonTeam: {
    gate: may('team', 'join'),
    changesWorld: true,
    run: ({ db, world, userId }) =>
      joinTeamByInviteResolver(db, { token: world.teamInviteToken, userId }),
    cells: whileTeamsChange(JOINING, {
      draft: everyone('team_invite_invalid'),
      review: everyone('team_invite_invalid'),
    }),
  },
  requestToJoinHackathonTeam: {
    gate: may('team', 'join'),
    changesWorld: true,
    run: (call) =>
      requestToJoinTeamResolver(call.db, {
        ...selfOf(call),
        teamId: call.world.teamId,
      }),
    cells: whileTeamsChange(JOINING),
  },
  cancelHackathonTeamRequest: {
    gate: may('team', 'join'),
    changesWorld: true,
    needs: 'teamRequest',
    run: (call) =>
      cancelTeamRequestResolver(call.db, {
        ...selfOf(call),
        requestId: call.world.requestId,
      }),
    cells: whilePublished(
      everyoneBut('team_request_not_found', { registered: 'ok' }),
    ),
  },
  answerHackathonTeamRequest: {
    gate: may('team', 'create'),
    changesWorld: true,
    needs: 'teamRequest',
    run: (call) =>
      answerTeamRequestResolver(call.db, {
        ...selfOf(call),
        requestId: call.world.requestId,
        decision: 'accept',
      }),
    cells: whileTeamsChange(CAPTAIN_ONLY),
  },
  leaveHackathonTeam: {
    gate: may('team', 'join'),
    changesWorld: true,
    run: (call) => leaveTeamResolver(call.db, selfOf(call)),
    cells: whileTeamsChange(
      everyoneBut('not_team_member', {
        captain: 'captain_must_transfer',
        member: 'ok',
      }),
    ),
  },
  passHackathonTeamCaptaincy: {
    gate: may('team', 'create'),
    changesWorld: true,
    run: (call) =>
      passCaptaincyResolver(call.db, {
        ...selfOf(call),
        memberId: teammate(call),
      }),
    cells: whileTeamsChange(CAPTAIN_ONLY),
  },
  removeHackathonTeamMember: {
    gate: may('team', 'create'),
    changesWorld: true,
    run: (call) =>
      removeTeamMemberResolver(call.db, {
        ...selfOf(call),
        memberId: teammate(call),
      }),
    cells: whileTeamsChange(CAPTAIN_ONLY),
  },
  getHackathonTeamPage: {
    gate: may('team', 'join'),
    run: (call) => teamPageResolver(call.db, selfOf(call)),
    cells: whilePublished(everyone('ok')),
  },
  getHackathonLookingForTeam: {
    gate: may('team', 'join'),
    run: (call) => lookingForTeamResolver(call.db, selfOf(call)),
    cells: whilePublished(everyone('ok')),
  },
};
