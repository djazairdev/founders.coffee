import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hackathonReviewApi, type HackathonDraftEmailRequest } from './api';
import { decisionRequest, type HackathonDecision } from './decisions';

const QUEUE_KEY = 'hackathon-review';

/** One page of the hackathons waiting for review; the page before stays on screen while it loads. */
export const useHackathonReviewQueue = (page: number) =>
  useQuery({
    queryKey: [QUEUE_KEY, page],
    queryFn: () => hackathonReviewApi.list({ page }),
    placeholderData: (previous) => previous,
  });

/**
 * Decide on one hackathon. The queue is reloaded however it ends, so a decision another operator
 * took first shows up rather than lingering.
 */
export const useDecideHackathon = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      eventId: string;
      version: number;
      decision: HackathonDecision;
      note: string;
    }) => {
      const request = decisionRequest(
        input.eventId,
        input.version,
        input.decision,
        input.note,
      );
      if (!request) throw new Error('The decision needs a note');
      return hackathonReviewApi.decide(request);
    },
    onSettled: () => cache.invalidateQueries({ queryKey: [QUEUE_KEY] }),
  });
};

export const useSendHackathonDraftEmail = () =>
  useMutation({
    mutationFn: (input: HackathonDraftEmailRequest) =>
      hackathonReviewApi.sendDraftEmail(input),
  });

export const useHackathonsForDeletion = (query: string) =>
  useQuery({
    queryKey: ['hackathon-delete-search', query],
    queryFn: () => hackathonReviewApi.findForDeletion({ query }),
    enabled: query.trim().length >= 2,
  });

export const useDeleteAnyHackathon = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => hackathonReviewApi.delete({ eventId }),
    onSuccess: () =>
      Promise.all([
        cache.invalidateQueries({ queryKey: [QUEUE_KEY] }),
        cache.invalidateQueries({ queryKey: ['hackathon-delete-search'] }),
      ]),
  });
};
