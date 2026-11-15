import {
  addHackathonPrize,
  assignHackathonPrize,
  answerHackathonTeamRequest,
  cancelHackathonTeamRequest,
  createHackathonTeam,
  createHackathonTeamInvite,
  getHackathonJudgeEntryPage,
  getHackathonJudgePage,
  getHackathonJudgingProgress,
  getHackathonPrizeDelivery,
  getHackathonLookingForTeam,
  getHackathonResults,
  getHackathonSubmissionPage,
  confirmHackathonProject,
  createHackathonProject,
  getHackathonCertificatePage,
  getHackathonTeamPage,
  publishHackathonProject,
  joinHackathonTeam,
  leaveHackathonTeam,
  passHackathonTeamCaptaincy,
  publishHackathonResults,
  removeHackathonTeamMember,
  requestToJoinHackathonTeam,
  revokeHackathonTeamInvite,
  removeHackathonScreenshot,
  reserveHackathonScreenshot,
  saveHackathonSubmissionDraft,
  submitHackathonSubmission,
  recuseFromHackathonEntry,
  remindHackathonJudges,
  saveHackathonScores,
  setHackathonPrizeDelivery,
  setHackathonRecordShown,
  type HackathonResultsEntry,
  type HackathonResultsView,
  type JudgeCriterionView,
  type JudgeEntryPageView,
  type JudgePageEntry,
  type JudgePageView,
  type JudgingProgressJudge,
  type JudgingProgressView,
  type LookingForTeamView,
  type SubmissionDraftSaved,
  type SubmissionPageView,
  type SubmissionSubmitted,
  type TeamInviteCreated,
  type TeamJoined,
  type TeamPageView,
  changeHackathonPrize,
  confirmHackathonPrize,
  createHackathonDraft,
  getHackathonDashboard,
  getHackathonParticipants,
  getHackathonTeams,
  getHackathonDraft,
  joinHackathonInterest,
  registerForHackathon,
  removeHackathonPrize,
  saveHackathonDeadlines,
  saveHackathonSettings,
  saveHackathonRubric,
  saveHackathonTracks,
  withdrawFromHackathon,
  type AddHackathonPrizeRequest,
  type CertificatePage,
  type OwnCertificate,
  type PrizeDeliveryView,
  type ChangeHackathonPrizeRequest,
  type ConfirmHackathonPrizeRequest,
  type CreateHackathonDraftRequest,
  type HackathonDashboard,
  type HackathonParticipantsView,
  type HackathonTeamsView,
  type HackathonSchedule,
  type HackathonDraftCreated,
  type HackathonDraftView,
  type HackathonRegistrationView,
  type JoinHackathonInterestRequest,
  type RegistrationCreated,
  type Withdrawn,
  type PublicHackathonPrizeView,
  type PublicHackathonRules,
  type PublicHackathonTrack,
  type RemoveHackathonPrizeRequest,
  type SaveHackathonDeadlinesRequest,
  type SaveHackathonSettingsRequest,
  type SaveHackathonRubricRequest,
  type SaveHackathonTracksRequest,
} from '@founders-coffee/server-fns';
import type { SubmissionDraftFields } from './submission-draft-fields';

export type { SubmissionDraftFields };

export const hackathonsApi = {
  joinHackathonInterest,
  createHackathonDraft,
  draft: (eventId: string) => getHackathonDraft({ data: { eventId } }),
  dashboard: (eventId: string) => getHackathonDashboard({ data: { eventId } }),
  roster: (eventId: string) => getHackathonParticipants({ data: { eventId } }),
  teams: (eventId: string) => getHackathonTeams({ data: { eventId } }),
  saveDeadlines: (request: SaveHackathonDeadlinesRequest) =>
    saveHackathonDeadlines({ data: request }),
  saveSettings: (request: SaveHackathonSettingsRequest) =>
    saveHackathonSettings({ data: request }),
  saveTracks: (request: SaveHackathonTracksRequest) =>
    saveHackathonTracks({ data: request }),
  saveRubric: (request: SaveHackathonRubricRequest) =>
    saveHackathonRubric({ data: request }),
  addPrize: (request: AddHackathonPrizeRequest) =>
    addHackathonPrize({ data: request }),
  changePrize: (request: ChangeHackathonPrizeRequest) =>
    changeHackathonPrize({ data: request }),
  removePrize: (request: RemoveHackathonPrizeRequest) =>
    removeHackathonPrize({ data: request }),
  confirmPrize: (request: ConfirmHackathonPrizeRequest) =>
    confirmHackathonPrize({ data: request }),
};

export type RegisterForHackathonRequest = Parameters<
  typeof registerForHackathon
>[0]['data'];

export const registrationApi = {
  register: (request: RegisterForHackathonRequest) =>
    registerForHackathon({ data: request }),
  withdraw: (eventId: string) => withdrawFromHackathon({ data: { eventId } }),
};

type EventScoped = { readonly eventId: string };
type TeamMemberRequest = EventScoped & { readonly memberId: string };
type TeamRequestAnswer = EventScoped & { readonly requestId: string };

export const certificatesApi = {
  page: (code: string) => getHackathonCertificatePage({ data: { code } }),
  setRecordShown: (isShown: boolean) =>
    setHackathonRecordShown({ data: { isShown } }),
};

export const teamsApi = {
  page: (eventId: string) => getHackathonTeamPage({ data: { eventId } }),
  createProject: (request: EventScoped) =>
    createHackathonProject({ data: request }),
  confirmProject: (projectId: string) =>
    confirmHackathonProject({ data: { projectId } }),
  publishProject: (projectId: string) =>
    publishHackathonProject({ data: { projectId } }),
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
  submit: (request: { readonly eventId: string; readonly version: number }) =>
    submitHackathonSubmission({
      data: { ...request, isOriginalWorkAttested: true },
    }),
  reserveScreenshot: (eventId: string) =>
    reserveHackathonScreenshot({ data: { eventId } }),
  removeScreenshot: (request: {
    readonly eventId: string;
    readonly screenshotId: string;
  }) => removeHackathonScreenshot({ data: request }),
};

export const hackathonResultsApi = {
  judges: (eventId: string) =>
    getHackathonJudgingProgress({ data: { eventId } }),
  remind: (eventId: string) => remindHackathonJudges({ data: { eventId } }),
  results: (eventId: string) => getHackathonResults({ data: { eventId } }),
  prizeDelivery: (eventId: string) =>
    getHackathonPrizeDelivery({ data: { eventId } }),
  assignPrize: (data: Parameters<typeof assignHackathonPrize>[0]['data']) =>
    assignHackathonPrize({ data }),
  setPrizeDelivery: (
    data: Parameters<typeof setHackathonPrizeDelivery>[0]['data'],
  ) => setHackathonPrizeDelivery({ data }),
  publish: (data: Parameters<typeof publishHackathonResults>[0]['data']) =>
    publishHackathonResults({ data }),
};

export const judgingApi = {
  page: (eventId: string) => getHackathonJudgePage({ data: { eventId } }),
  entry: (data: { readonly eventId: string; readonly submissionId: string }) =>
    getHackathonJudgeEntryPage({ data }),
  saveScores: (data: Parameters<typeof saveHackathonScores>[0]['data']) =>
    saveHackathonScores({ data }),
  recuse: (data: Parameters<typeof recuseFromHackathonEntry>[0]['data']) =>
    recuseFromHackathonEntry({ data }),
};

export type {
  AddHackathonPrizeRequest,
  CertificatePage,
  OwnCertificate,
  PrizeDeliveryView,
  HackathonResultsEntry,
  HackathonResultsView,
  JudgeCriterionView,
  JudgeEntryPageView,
  JudgePageEntry,
  JudgePageView,
  JudgingProgressJudge,
  JudgingProgressView,
  LookingForTeamView,
  SubmissionDraftSaved,
  SubmissionPageView,
  SubmissionSubmitted,
  TeamInviteCreated,
  TeamJoined,
  TeamPageView,
  HackathonSchedule,
  ChangeHackathonPrizeRequest,
  ConfirmHackathonPrizeRequest,
  CreateHackathonDraftRequest,
  HackathonDashboard,
  HackathonParticipantsView,
  HackathonTeamsView,
  HackathonDraftCreated,
  HackathonDraftView,
  HackathonRegistrationView,
  JoinHackathonInterestRequest,
  RegistrationCreated,
  Withdrawn,
  PublicHackathonPrizeView,
  PublicHackathonRules,
  PublicHackathonTrack,
  RemoveHackathonPrizeRequest,
  SaveHackathonDeadlinesRequest,
  SaveHackathonSettingsRequest,
  SaveHackathonRubricRequest,
  SaveHackathonTracksRequest,
};
export type * from './view-types';

export {
  answerHackathonJudgeInvite,
  answerHackathonMentorInvite,
  createHackathonJudgeInvite,
  createHackathonMentorInvite,
  getHackathonPlaceInvite,
  listHackathonJudges,
  listHackathonMentors,
  removeHackathonJudge,
  removeHackathonMentor,
  type JudgeInviteAnswered,
  type OrganiserJudgeView,
  type OrganiserMentorView,
  type PlaceInviteView,
} from '@founders-coffee/server-fns';
