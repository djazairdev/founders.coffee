import {
  addHackathonPrize,
  changeHackathonPrize,
  confirmHackathonPrize,
  createHackathonDraft,
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

export type {
  AddHackathonPrizeRequest,
  ChangeHackathonPrizeRequest,
  ConfirmHackathonPrizeRequest,
  CreateHackathonDraftRequest,
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
