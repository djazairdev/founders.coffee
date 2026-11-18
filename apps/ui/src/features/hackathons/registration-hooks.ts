import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  registrationApi,
  type RegisterForHackathonRequest,
  type RegistrationCreated,
  type Withdrawn,
} from './api';

const TEAM = ['hackathons', 'team'] as const;

/**
 * A change to the signed-in member's registration (B-REG-06). The team pages hang on it, so they
 * are read again once it lands; the hackathon's own page is read again by its caller.
 */
const useRegistrationChange = <Input, Output>(
  change: (input: Input) => Promise<Output>,
) => {
  const cache = useQueryClient();
  return useMutation<Output, Error, Input>({
    mutationFn: change,
    onSettled: () => cache.invalidateQueries({ queryKey: TEAM }),
  });
};

export const useRegisterForHackathon = () =>
  useRegistrationChange<RegisterForHackathonRequest, RegistrationCreated>(
    registrationApi.register,
  );

export const useWithdrawFromHackathon = () =>
  useRegistrationChange<string, Withdrawn>(registrationApi.withdraw);
