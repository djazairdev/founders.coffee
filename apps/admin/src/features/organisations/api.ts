import {
  decideOrganisationApplication,
  listOrganisationReviewQueue,
} from '@founders-coffee/server-fns/admin';
import type {
  OrganisationDecided,
  OrganisationDecisionRequest,
  OrganisationReviewQueue,
  OrganisationReviewQueueRequest,
} from '@founders-coffee/server-fns/admin';

export type {
  OrganisationReviewItem,
  OrganisationReviewQueue,
} from '@founders-coffee/server-fns/admin';

export const organisationReviewApi = {
  list: (
    request: OrganisationReviewQueueRequest,
  ): Promise<OrganisationReviewQueue> =>
    listOrganisationReviewQueue({ data: request }),
  decide: (
    request: OrganisationDecisionRequest,
  ): Promise<OrganisationDecided> =>
    decideOrganisationApplication({ data: request }),
};
