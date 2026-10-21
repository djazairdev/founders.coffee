import {
  joinHackathonInterest,
  type JoinHackathonInterestRequest,
} from '@founders-coffee/server-fns';

export const hackathonsApi = {
  joinHackathonInterest,
};

export type { JoinHackathonInterestRequest };
export type JoinHackathonInterestArgs = { data: JoinHackathonInterestRequest };
