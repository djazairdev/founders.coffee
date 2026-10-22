import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { reportReviewApi } from './api';
import { reportDecisionRequest, type ReportDecisionDraft } from './decisions';

const QUEUE_KEY = 'hackathon-reports';

/** One page of the reported entries and teams; the page before stays on screen while it loads. */
export const useReportQueue = (page: number) =>
  useQuery({
    queryKey: [QUEUE_KEY, page],
    queryFn: () => reportReviewApi.list({ page }),
    placeholderData: (previous) => previous,
  });

/**
 * Decide on one reported target. The queue is reloaded however it ends, so a decision another
 * administrator took first shows up rather than lingering.
 */
export const useDecideReport = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (draft: ReportDecisionDraft) => {
      const request = reportDecisionRequest(draft);
      if (!request) throw new Error('The decision needs a reason and evidence');
      return reportReviewApi.decide(request);
    },
    onSettled: () => cache.invalidateQueries({ queryKey: [QUEUE_KEY] }),
  });
};
