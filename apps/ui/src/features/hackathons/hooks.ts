import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  hackathonsApi,
  type CreateHackathonDraftRequest,
  type HackathonDraftCreated,
  type JoinHackathonInterestArgs,
} from './api';

export const useJoinHackathonInterest = () =>
  useMutation({
    mutationFn: (input: JoinHackathonInterestArgs) =>
      hackathonsApi.joinHackathonInterest(input),
  });

/** Save a hackathon's first step as a draft; the organisation's own page is read again after. */
export const useCreateHackathonDraft = () => {
  const cache = useQueryClient();
  return useMutation<HackathonDraftCreated, Error, CreateHackathonDraftRequest>(
    {
      mutationFn: (request) =>
        hackathonsApi.createHackathonDraft({ data: request }),
      onSuccess: () =>
        cache.invalidateQueries({ queryKey: ['organisations', 'mine'] }),
    },
  );
};
