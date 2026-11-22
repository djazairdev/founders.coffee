import {
  deleteAnyHackathon,
  decideHackathonReviewDecision,
  findHackathonsForDeletion,
  listHackathonReviewQueue,
  sendHackathonDraftEmail,
} from '@founders-coffee/server-fns/admin';
import type {
  HackathonDecided,
  HackathonDecisionRequest,
  HackathonDraftEmailRequest,
  HackathonReviewQueue,
  HackathonReviewQueueRequest,
  AdminDeleteHackathonRequest,
  HackathonDeleted,
  HackathonDeletionCandidate,
  SearchHackathonsForDeletionRequest,
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

export type { HackathonDeletionCandidate };

export const hackathonReviewApi = {
  list: (request: HackathonReviewQueueRequest): Promise<HackathonReviewQueue> =>
    listHackathonReviewQueue({ data: request }),
  decide: (request: HackathonDecisionRequest): Promise<HackathonDecided> =>
    decideHackathonReviewDecision({ data: request }),
  sendDraftEmail: (request: HackathonDraftEmailRequest) =>
    sendHackathonDraftEmail({ data: request }),
  findForDeletion: (
    request: SearchHackathonsForDeletionRequest,
  ): Promise<readonly HackathonDeletionCandidate[]> =>
    findHackathonsForDeletion({ data: request }),
  delete: (request: AdminDeleteHackathonRequest): Promise<HackathonDeleted> =>
    deleteAnyHackathon({ data: request }),
};
