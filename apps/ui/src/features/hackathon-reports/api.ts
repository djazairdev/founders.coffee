import { reportHackathonTarget } from '@founders-coffee/server-fns';

export type HackathonReportRequest = Parameters<
  typeof reportHackathonTarget
>[0]['data'];

export const hackathonReportsApi = {
  report: (data: HackathonReportRequest) => reportHackathonTarget({ data }),
};
