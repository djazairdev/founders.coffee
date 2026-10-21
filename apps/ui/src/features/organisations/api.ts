import {
  applyForOrganisation,
  type ApplyForOrganisationRequest,
} from '@founders-coffee/server-fns';

export const organisationsApi = {
  apply: (application: ApplyForOrganisationRequest) =>
    applyForOrganisation({ data: application }),
};

export type { ApplyForOrganisationRequest };
