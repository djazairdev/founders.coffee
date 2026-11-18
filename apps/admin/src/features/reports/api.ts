import {
  decideHackathonReport,
  listHackathonReportQueue,
} from '@founders-coffee/server-fns/admin';
import type {
  ReportDecided,
  ReportDecisionRequest,
  ReportQueue,
  ReportQueueRequest,
} from '@founders-coffee/server-fns/admin';

export type {
  ReportQueue,
  ReportQueueItem,
} from '@founders-coffee/server-fns/admin';

export const reportReviewApi = {
  list: (request: ReportQueueRequest): Promise<ReportQueue> =>
    listHackathonReportQueue({ data: request }),
  decide: (request: ReportDecisionRequest): Promise<ReportDecided> =>
    decideHackathonReport({ data: request }),
};
