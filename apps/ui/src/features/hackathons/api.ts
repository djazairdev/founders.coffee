import {
  addHackathonPrize,
  answerHackathonTeamRequest,
  cancelHackathonTeamRequest,
  createHackathonTeam,
  createHackathonTeamInvite,
  getHackathonTeamPage,
  joinHackathonTeam,
  leaveHackathonTeam,
  passHackathonTeamCaptaincy,
  removeHackathonTeamMember,
  revokeHackathonTeamInvite,
  type TeamInviteCreated,
  type TeamPageView,
  changeHackathonPrize,
  confirmHackathonPrize,
  createHackathonDraft,
  getHackathonDashboard,
  getHackathonDraft,
  joinHackathonInterest,
  removeHackathonPrize,
  saveHackathonDetails,
  saveHackathonRubric,
  saveHackathonTracks,
  submitHackathonForReview,
  type AddHackathonPrizeRequest,
  type ChangeHackathonPrizeRequest,
  type ConfirmHackathonPrizeRequest,
  type CreateHackathonDraftRequest,
  type HackathonDashboard,
  type HackathonSchedule,
  type HackathonDraftCreated,
  type HackathonDraftView,
  type JoinHackathonInterestRequest,
  type RemoveHackathonPrizeRequest,
  type SaveHackathonDetailsRequest,
  type SaveHackathonRubricRequest,
  type SaveHackathonTracksRequest,
  type SubmitHackathonForReviewRequest,
} from '@founders-coffee/server-fns';

export const hackathonsApi = {
  joinHackathonInterest,
  createHackathonDraft,
  draft: (eventId: string) => getHackathonDraft({ data: { eventId } }),
  dashboard: (eventId: string) => getHackathonDashboard({ data: { eventId } }),
  saveDetails: (request: SaveHackathonDetailsRequest) =>
    saveHackathonDetails({ data: request }),
  saveTracks: (request: SaveHackathonTracksRequest) =>
    saveHackathonTracks({ data: request }),
  saveRubric: (request: SaveHackathonRubricRequest) =>
    saveHackathonRubric({ data: request }),
  submitForReview: (request: SubmitHackathonForReviewRequest) =>
    submitHackathonForReview({ data: request }),
  addPrize: (request: AddHackathonPrizeRequest) =>
    addHackathonPrize({ data: request }),
  changePrize: (request: ChangeHackathonPrizeRequest) =>
    changeHackathonPrize({ data: request }),
  removePrize: (request: RemoveHackathonPrizeRequest) =>
    removeHackathonPrize({ data: request }),
  confirmPrize: (request: ConfirmHackathonPrizeRequest) =>
    confirmHackathonPrize({ data: request }),
};

type EventScoped = { readonly eventId: string };
type TeamMemberRequest = EventScoped & { readonly memberId: string };
type TeamRequestAnswer = EventScoped & { readonly requestId: string };

export const teamsApi = {
  page: (eventId: string) => getHackathonTeamPage({ data: { eventId } }),
  create: (request: {
    readonly eventId: string;
    readonly name: string;
    readonly description: string | null;
    readonly isLookingForMembers: boolean;
  }) => createHackathonTeam({ data: request }),
  createInvite: (request: EventScoped) =>
    createHackathonTeamInvite({ data: request }),
  revokeInvite: (request: EventScoped) =>
    revokeHackathonTeamInvite({ data: request }),
  join: (token: string) => joinHackathonTeam({ data: { token } }),
  answerRequest: (
    request: TeamRequestAnswer & { readonly decision: 'accept' | 'decline' },
  ) => answerHackathonTeamRequest({ data: request }),
  cancelRequest: (request: TeamRequestAnswer) =>
    cancelHackathonTeamRequest({ data: request }),
  leave: (request: EventScoped) => leaveHackathonTeam({ data: request }),
  passCaptaincy: (request: TeamMemberRequest) =>
    passHackathonTeamCaptaincy({ data: request }),
  removeMember: (request: TeamMemberRequest) =>
    removeHackathonTeamMember({ data: request }),
};

export type {
  AddHackathonPrizeRequest,
  TeamInviteCreated,
  TeamPageView,
  HackathonSchedule,
  ChangeHackathonPrizeRequest,
  ConfirmHackathonPrizeRequest,
  CreateHackathonDraftRequest,
  HackathonDashboard,
  HackathonDraftCreated,
  HackathonDraftView,
  JoinHackathonInterestRequest,
  RemoveHackathonPrizeRequest,
  SaveHackathonDetailsRequest,
  SaveHackathonRubricRequest,
  SaveHackathonTracksRequest,
  SubmitHackathonForReviewRequest,
};
export type HackathonEditSaved = {
  readonly eventId: string;
  readonly version: number;
};
export type HackathonTrackView = HackathonDraftView['tracks'][number];
export type HackathonPrizeView = HackathonDraftView['prizes'][number];
export type HackathonBasicsRequest = CreateHackathonDraftRequest['hackathon'];
export type JoinHackathonInterestArgs = { data: JoinHackathonInterestRequest };
