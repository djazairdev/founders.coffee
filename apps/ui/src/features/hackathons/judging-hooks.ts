import { useQuery } from '@tanstack/react-query';

import { judgingApi, type JudgePageView } from './api';

/** The signed-in member's judge page for a hackathon (B-JDG-06). */
export const useJudgePage = (eventId: string) =>
  useQuery<JudgePageView>({
    queryKey: ['hackathons', 'judging', eventId],
    queryFn: () => judgingApi.page(eventId),
  });
