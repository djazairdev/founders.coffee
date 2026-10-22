import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  hackathonsApi,
  type CreateHackathonDraftRequest,
  type HackathonDraftCreated,
  type HackathonDraftView,
  type JoinHackathonInterestArgs,
  type SaveHackathonDetailsRequest,
} from './api';

const DRAFT = ['hackathons', 'draft'] as const;

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

/** A hackathon as its organisers manage it. */
export const useHackathonDraft = (eventId: string) =>
  useQuery<HackathonDraftView>({
    queryKey: [...DRAFT, eventId],
    queryFn: () => hackathonsApi.draft(eventId),
  });

/** Save a hackathon's second step; the hackathon is read again after. */
export const useSaveHackathonDetails = () => {
  const cache = useQueryClient();
  return useMutation<
    { readonly eventId: string },
    Error,
    SaveHackathonDetailsRequest
  >({
    mutationFn: (request) => hackathonsApi.saveDetails(request),
    onSuccess: (_saved, request) =>
      cache.invalidateQueries({ queryKey: [...DRAFT, request.eventId] }),
  });
};
