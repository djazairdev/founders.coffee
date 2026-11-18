import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { eventCoHostsApi, type EventCoHostChangeRequest } from './api';

const CO_HOSTS_KEY = 'event-co-hosts';

/** The organisers of the event an operator named, once they have named one. */
export const useEventCoHosts = (reference: string | null) =>
  useQuery({
    queryKey: [CO_HOSTS_KEY, reference],
    queryFn: () => eventCoHostsApi.find(reference ?? ''),
    enabled: reference !== null,
    retry: false,
  });

/**
 * Add or remove one co-host. The organisers on screen are replaced by the ones the change answers
 * with, and reloaded however it ends, so a change another operator made first shows up.
 */
export const useChangeCoHost = (reference: string | null) => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      change: 'add' | 'remove';
      request: EventCoHostChangeRequest;
    }) =>
      input.change === 'add'
        ? eventCoHostsApi.add(input.request)
        : eventCoHostsApi.remove(input.request),
    onSuccess: (data) => cache.setQueryData([CO_HOSTS_KEY, reference], data),
    onSettled: () => cache.invalidateQueries({ queryKey: [CO_HOSTS_KEY] }),
  });
};
