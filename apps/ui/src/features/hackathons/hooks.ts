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
  type HackathonDashboard,
  type HackathonParticipantsView,
  type HackathonTeamsView,
  type HackathonDraftCreated,
  type HackathonEditSaved,
  type HackathonDraftView,
  type JoinHackathonInterestArgs,
  type RemoveHackathonPrizeRequest,
  type SaveHackathonDeadlinesRequest,
  type SaveHackathonSettingsRequest,
  type SaveHackathonRubricRequest,
  type SaveHackathonTracksRequest,
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
    refetchOnWindowFocus: (query) =>
      query.state.data?.review.status === 'submitted' ? 'always' : false,
  });

/** Who registered for a hackathon, for its organisers (B-REG-08). */
export const useHackathonParticipants = (eventId: string) =>
  useQuery<HackathonParticipantsView>({
    queryKey: [...DRAFT, eventId, 'participants'],
    queryFn: () => hackathonsApi.roster(eventId),
    refetchOnWindowFocus: 'always',
  });

/** A hackathon's teams and entries, for its organisers (B-OPS-02). */
export const useHackathonTeams = (eventId: string) =>
  useQuery<HackathonTeamsView>({
    queryKey: [...DRAFT, eventId, 'teams'],
    queryFn: () => hackathonsApi.teams(eventId),
    refetchOnWindowFocus: 'always',
  });

/** A hackathon's counts for its organisers (B-OPS-01), under the hackathon's own key. */
export const useHackathonDashboard = (eventId: string) =>
  useQuery<HackathonDashboard>({
    queryKey: [...DRAFT, eventId, 'dashboard'],
    queryFn: () => hackathonsApi.dashboard(eventId),
    refetchOnWindowFocus: 'always',
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

/** Save a hackathon's dates; the hackathon is read again after. */
export const useSaveHackathonDeadlines = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, SaveHackathonDeadlinesRequest>({
    mutationFn: (request) => hackathonsApi.saveDeadlines(request),
    onSuccess: (saved) => afterEdit(cache, saved),
  });
};

/** Save a hackathon's rules and participation settings; the hackathon is read again after. */
export const useSaveHackathonSettings = () => {
  const cache = useQueryClient();
  return useMutation<HackathonEditSaved, Error, SaveHackathonSettingsRequest>({
    mutationFn: (request) => hackathonsApi.saveSettings(request),
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
