import {
  createHackathonDraft,
  joinHackathonInterest,
  type CreateHackathonDraftRequest,
  type HackathonDraftCreated,
  type JoinHackathonInterestRequest,
} from '@founders-coffee/server-fns';

export const hackathonsApi = {
  joinHackathonInterest,
  createHackathonDraft,
};

export type {
  CreateHackathonDraftRequest,
  HackathonDraftCreated,
  JoinHackathonInterestRequest,
};
export type HackathonBasicsRequest = CreateHackathonDraftRequest['hackathon'];
export type JoinHackathonInterestArgs = { data: JoinHackathonInterestRequest };
