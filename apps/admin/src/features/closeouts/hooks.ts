import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { missingCloseoutsApi } from './api';

const CLOSEOUTS_KEY = 'admin-missing-closeouts';

export const useMissingCloseouts = () =>
  useQuery({
    queryKey: [CLOSEOUTS_KEY],
    queryFn: () => missingCloseoutsApi.list(),
  });

export const useCreateMissingCloseout = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: missingCloseoutsApi.create,
    onSettled: () => cache.invalidateQueries({ queryKey: [CLOSEOUTS_KEY] }),
  });
};
