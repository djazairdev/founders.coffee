import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  hackathonsApi,
  type AddHackathonPrizeRequest,
  type ChangeHackathonPrizeRequest,
  type ConfirmHackathonPrizeRequest,
  type CreateHackathonDraftRequest,
  type HackathonDraftCreated,
  type HackathonEditSaved,
  type HackathonDraftView,
  type JoinHackathonInterestArgs,
  type RemoveHackathonPrizeRequest,
  type SaveHackathonDetailsRequest,
  type SaveHackathonRubricRequest,
  type SaveHackathonTracksRequest,
  type SubmitHackathonForReviewRequest,
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

/**
 * After an edit lands: the cached hackathon takes the new version at once, so the next section
 * saved is not refused as stale while the hackathon is read again.
 */
const afterEdit = (cache: QueryClient, saved: HackathonEditSaved) => {
  cache.setQueryData<HackathonDraftView>([...DRAFT, saved.eventId], (draft) =>
    draft ? { ...draft, version: saved.version } : draft,
  );
  return cache.invalidateQueries({ queryKey: [...DRAFT, saved.eventId] });
};

/** Save a hackathon's rules and who can take part; the hackathon is read again after. */
export const useSaveHackathonDetails = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, SaveHackathonDetailsRequest>({
    mutationFn: (request) => hackathonsApi.saveDetails(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};

/** Save a hackathon's tracks; the hackathon is read again after. */
export const useSaveHackathonTracks = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, SaveHackathonTracksRequest>({
    mutationFn: (request) => hackathonsApi.saveTracks(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};

/** Send a hackathon for review; the hackathon is read again after, now with the reviewers. */
export const useSubmitHackathonForReview = () => {
  const cache = useQueryClient();
  return useMutation<
    HackathonEditSaved,
    Error,
    SubmitHackathonForReviewRequest
  >({
    mutationFn: (request) => hackathonsApi.submitForReview(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};

/** Save a hackathon's judging rubric; the hackathon is read again after. */
export const useSaveHackathonRubric = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, SaveHackathonRubricRequest>({
    mutationFn: (request) => hackathonsApi.saveRubric(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};

/** Add a prize to a hackathon; the hackathon is read again after. */
export const useAddHackathonPrize = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, AddHackathonPrizeRequest>({
    mutationFn: (request) => hackathonsApi.addPrize(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};

/** Reword a prize; the hackathon is read again after. */
export const useChangeHackathonPrize = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, ChangeHackathonPrizeRequest>({
    mutationFn: (request) => hackathonsApi.changePrize(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};

/** Withdraw a prize; the hackathon is read again after. */
export const useRemoveHackathonPrize = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, RemoveHackathonPrizeRequest>({
    mutationFn: (request) => hackathonsApi.removePrize(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};

/** Record a prize's confirmation; the hackathon is read again after. */
export const useConfirmHackathonPrize = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, ConfirmHackathonPrizeRequest>({
    mutationFn: (request) => hackathonsApi.confirmPrize(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};
