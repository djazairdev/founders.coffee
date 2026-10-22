import {
  createHackathonDraft,
  getHackathonDraft,
  joinHackathonInterest,
  saveHackathonDetails,
  saveHackathonRubric,
  saveHackathonTracks,
  submitHackathonForReview,
  type CreateHackathonDraftRequest,
  type HackathonDraftCreated,
  type HackathonDraftView,
  type JoinHackathonInterestRequest,
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
};

export type {
  CreateHackathonDraftRequest,
  HackathonDraftCreated,
  HackathonDraftView,
  JoinHackathonInterestRequest,
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
export type HackathonBasicsRequest = CreateHackathonDraftRequest['hackathon'];
export type JoinHackathonInterestArgs = { data: JoinHackathonInterestRequest };
