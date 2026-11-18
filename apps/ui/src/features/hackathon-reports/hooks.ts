import { useMutation } from '@tanstack/react-query';

import { hackathonReportsApi, type HackathonReportRequest } from './api';

/** Report an entry or a team of a hackathon for an administrator to review (B-SAFE-01). */
export const useReportHackathonTarget = () =>
  useMutation<{ readonly reported: true }, Error, HackathonReportRequest>({
    mutationFn: hackathonReportsApi.report,
  });
