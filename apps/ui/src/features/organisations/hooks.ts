import { useMutation, useQueryClient } from '@tanstack/react-query';

import { organisationsApi, type ApplyForOrganisationRequest } from './api';

/** Send an organisation application; the member's own organisations are read again after. */
export const useApplyForOrganisation = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (application: ApplyForOrganisationRequest) =>
      organisationsApi.apply(application),
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: ['organisations', 'mine'] }),
  });
};
