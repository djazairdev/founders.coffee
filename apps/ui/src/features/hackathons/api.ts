import {
  createHackathonDraft,
  getHackathonDraft,
  joinHackathonInterest,
  saveHackathonDetails,
  saveHackathonTracks,
  type CreateHackathonDraftRequest,
  type HackathonDraftCreated,
  type HackathonDraftView,
  type JoinHackathonInterestRequest,
  type SaveHackathonDetailsRequest,
  type SaveHackathonTracksRequest,
} from '@founders-coffee/server-fns';

export const hackathonsApi = {
  joinHackathonInterest,
  createHackathonDraft,
  draft: (eventId: string) => getHackathonDraft({ data: { eventId } }),
  saveDetails: (request: SaveHackathonDetailsRequest) =>
    saveHackathonDetails({ data: request }),
  saveTracks: (request: SaveHackathonTracksRequest) =>
    saveHackathonTracks({ data: request }),
};

export type {
  CreateHackathonDraftRequest,
  HackathonDraftCreated,
  HackathonDraftView,
  JoinHackathonInterestRequest,
  SaveHackathonDetailsRequest,
  SaveHackathonTracksRequest,
};
export type HackathonEditSaved = {
  readonly eventId: string;
  readonly version: number;
};
export type HackathonTrackView = HackathonDraftView['tracks'][number];
export type HackathonBasicsRequest = CreateHackathonDraftRequest['hackathon'];
export type JoinHackathonInterestArgs = { data: JoinHackathonInterestRequest };
