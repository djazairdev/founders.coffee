import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { judgingApi, type JudgeEntryPageView, type JudgePageView } from './api';

const JUDGING = ['hackathons', 'judging'] as const;

/** The signed-in member's judge page for a hackathon (B-JDG-06). */
export const useJudgePage = (eventId: string) =>
  useQuery<JudgePageView>({
    queryKey: [...JUDGING, eventId],
    queryFn: () => judgingApi.page(eventId),
  });

/** One submission as the signed-in judge scores it (B-JDG-07). */
export const useJudgeEntryPage = (eventId: string, submissionId: string) =>
  useQuery<JudgeEntryPageView>({
    queryKey: [...JUDGING, eventId, 'entry', submissionId],
    queryFn: () => judgingApi.entry({ eventId, submissionId }),
  });

/** A judge's change that reads the judging pages again once it lands, whether it worked or not. */
const useJudgingChange = <Input, Output>(
  eventId: string,
  change: (input: Input) => Promise<Output>,
) => {
  const cache = useQueryClient();
  return useMutation<Output, Error, Input>({
    mutationFn: change,
    onSettled: () =>
      cache.invalidateQueries({ queryKey: [...JUDGING, eventId] }),
  });
};

/** Save the judge's scores for a submission, replacing the ones they saved before. */
export const useSaveJudgeScores = (eventId: string) =>
  useJudgingChange(eventId, judgingApi.saveScores);

/** Recuse the judge from a submission, for good. */
export const useRecuseFromEntry = (eventId: string) =>
  useJudgingChange(eventId, judgingApi.recuse);
