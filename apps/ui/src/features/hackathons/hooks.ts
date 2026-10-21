import { useMutation } from '@tanstack/react-query';

import { hackathonsApi, type JoinHackathonInterestArgs } from './api';

export const useJoinHackathonInterest = () =>
  useMutation({
    mutationFn: (input: JoinHackathonInterestArgs) =>
      hackathonsApi.joinHackathonInterest(input),
  });
