import {
  addHackathonPrize,
  answerHackathonTeamRequest,
  cancelHackathonTeamRequest,
  createHackathonTeam,
  createHackathonTeamInvite,
  getHackathonLookingForTeam,
  getHackathonSubmissionPage,
  getHackathonTeamPage,
  joinHackathonTeam,
  leaveHackathonTeam,
  passHackathonTeamCaptaincy,
  removeHackathonTeamMember,
  requestToJoinHackathonTeam,
  revokeHackathonTeamInvite,
  saveHackathonSubmissionDraft,
  type LookingForTeamView,
  type SubmissionDraftSaved,
  type SubmissionPageView,
  type TeamInviteCreated,
  type TeamJoined,
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
  type EventPage,
  type HackathonDashboard,
  type HackathonSchedule,
  type HackathonDraftCreated,
  type HackathonDraftView,
  type JoinHackathonInterestRequest,
  type PublicHackathonPrizeView,
  type PublicHackathonRules,
  type PublicHackathonTrack,
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
  looking: (eventId: string) =>
    getHackathonLookingForTeam({ data: { eventId } }),
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
  request: (request: EventScoped & { readonly teamId: string }) =>
    requestToJoinHackathonTeam({ data: request }),
  cancelRequest: (request: TeamRequestAnswer) =>
    cancelHackathonTeamRequest({ data: request }),
  leave: (request: EventScoped) => leaveHackathonTeam({ data: request }),
  passCaptaincy: (request: TeamMemberRequest) =>
    passHackathonTeamCaptaincy({ data: request }),
  removeMember: (request: TeamMemberRequest) =>
    removeHackathonTeamMember({ data: request }),
};

export type SubmissionDraftFields = {
  readonly trackId: string | null;
  readonly title: string;
  readonly description: string;
  readonly repositoryUrl: string | null;
  readonly demoVideoUrl: string | null;
  readonly pullRequestUrls: readonly string[];
  readonly aiTools: readonly string[];
  readonly aiStatement: string | null;
};

export const submissionsApi = {
  page: (eventId: string) => getHackathonSubmissionPage({ data: { eventId } }),
  saveDraft: (request: {
    readonly eventId: string;
    readonly version: number;
    readonly draft: SubmissionDraftFields;
  }) =>
    saveHackathonSubmissionDraft({
      data: {
        ...request,
        draft: {
          ...request.draft,
          pullRequestUrls: [...request.draft.pullRequestUrls],
          aiTools: [...request.draft.aiTools],
        },
      },
    }),
};

export type {
  AddHackathonPrizeRequest,
  LookingForTeamView,
  SubmissionDraftSaved,
  SubmissionPageView,
  TeamInviteCreated,
  TeamJoined,
  TeamPageView,
  HackathonSchedule,
  ChangeHackathonPrizeRequest,
  ConfirmHackathonPrizeRequest,
  CreateHackathonDraftRequest,
  HackathonDashboard,
  HackathonDraftCreated,
  HackathonDraftView,
  JoinHackathonInterestRequest,
  PublicHackathonPrizeView,
  PublicHackathonRules,
  PublicHackathonTrack,
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
export type HackathonOffer = {
  readonly tracks: readonly PublicHackathonTrack[];
  readonly prizes: readonly PublicHackathonPrizeView[];
};
export type HackathonJudgeView = EventPage['judges'][number];
export type HackathonPageDetails = HackathonOffer & {
  readonly rules: PublicHackathonRules;
  readonly judges: readonly HackathonJudgeView[];
};
export type HackathonPrizeView = HackathonDraftView['prizes'][number];
export type HackathonBasicsRequest = CreateHackathonDraftRequest['hackathon'];
export type JoinHackathonInterestArgs = { data: JoinHackathonInterestRequest };
