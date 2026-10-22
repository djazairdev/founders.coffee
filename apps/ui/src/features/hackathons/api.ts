import {
  createHackathonDraft,
  getHackathonDraft,
  joinHackathonInterest,
  saveHackathonDetails,
  type CreateHackathonDraftRequest,
  type HackathonDraftCreated,
  type HackathonDraftView,
  type JoinHackathonInterestRequest,
  type SaveHackathonDetailsRequest,
} from '@founders-coffee/server-fns';

export const hackathonsApi = {
  joinHackathonInterest,
  createHackathonDraft,
  draft: (eventId: string) => getHackathonDraft({ data: { eventId } }),
  saveDetails: (request: SaveHackathonDetailsRequest) =>
    saveHackathonDetails({ data: request }),
};

export type {
  CreateHackathonDraftRequest,
  HackathonDraftCreated,
  HackathonDraftView,
  JoinHackathonInterestRequest,
  SaveHackathonDetailsRequest,
};
export type HackathonBasicsRequest = CreateHackathonDraftRequest['hackathon'];
export type JoinHackathonInterestArgs = { data: JoinHackathonInterestRequest };
