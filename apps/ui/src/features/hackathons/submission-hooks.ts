import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  submissionsApi,
  type SubmissionDraftFields,
  type SubmissionDraftSaved,
  type SubmissionPageView,
  type SubmissionSubmitted,
} from './api';

const SUBMISSION = ['hackathons', 'submission'] as const;

type DraftSave = {
  readonly version: number;
  readonly draft: SubmissionDraftFields;
};

/** The signed-in member's submission page for a hackathon (B-SUB-05). */
export const useSubmissionPage = (eventId: string) =>
  useQuery<SubmissionPageView>({
    queryKey: [...SUBMISSION, eventId],
    queryFn: () => submissionsApi.page(eventId),
  });

/** Save the team's project as a draft, then read the page again whether it worked or not. */
export const useSaveSubmissionDraft = (eventId: string) => {
  const cache = useQueryClient();
  return useMutation<SubmissionDraftSaved, Error, DraftSave>({
    mutationFn: (input) => submissionsApi.saveDraft({ eventId, ...input }),
    onSettled: () =>
      cache.invalidateQueries({ queryKey: [...SUBMISSION, eventId] }),
  });
};

/**
 * Submit the team's saved project at the version the captain saw (B-SUB-06), then read the page
 * again whether it worked or not.
 */
export const useSubmitSubmission = (eventId: string) => {
  const cache = useQueryClient();
  return useMutation<SubmissionSubmitted, Error, number>({
    mutationFn: (version) => submissionsApi.submit({ eventId, version }),
    onSettled: () =>
      cache.invalidateQueries({ queryKey: [...SUBMISSION, eventId] }),
  });
};
