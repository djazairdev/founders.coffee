import {
  decideHackathonReviewDecision,
  listHackathonReviewQueue,
} from '@founders-coffee/server-fns/admin';
import type {
  HackathonDecided,
  HackathonDecisionRequest,
  HackathonReviewQueue,
  HackathonReviewQueueRequest,
} from '@founders-coffee/server-fns/admin';

export type {
  HackathonReviewItem,
  HackathonReviewQueue,
} from '@founders-coffee/server-fns/admin';

export const hackathonReviewApi = {
  list: (request: HackathonReviewQueueRequest): Promise<HackathonReviewQueue> =>
    listHackathonReviewQueue({ data: request }),
  decide: (request: HackathonDecisionRequest): Promise<HackathonDecided> =>
    decideHackathonReviewDecision({ data: request }),
};
