import {
  decideHackathonReviewDecision,
  listHackathonReviewQueue,
  sendHackathonDraftEmail,
} from '@founders-coffee/server-fns/admin';
import type {
  HackathonDecided,
  HackathonDecisionRequest,
  HackathonDraftEmailRequest,
  HackathonReviewQueue,
  HackathonReviewQueueRequest,
} from '@founders-coffee/server-fns/admin';

export type {
  HackathonReviewCriterion,
  HackathonDraftEmailRequest,
  HackathonReviewIncompleteItem,
  HackathonReviewItem,
  HackathonReviewPrize,
  HackathonReviewQueue,
  HackathonReviewReadyItem,
  HackathonReviewTrack,
} from '@founders-coffee/server-fns/admin';

export const hackathonReviewApi = {
  list: (request: HackathonReviewQueueRequest): Promise<HackathonReviewQueue> =>
    listHackathonReviewQueue({ data: request }),
  decide: (request: HackathonDecisionRequest): Promise<HackathonDecided> =>
    decideHackathonReviewDecision({ data: request }),
  sendDraftEmail: (request: HackathonDraftEmailRequest) =>
    sendHackathonDraftEmail({ data: request }),
};
