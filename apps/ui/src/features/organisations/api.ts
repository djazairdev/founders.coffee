import {
  applyForOrganisation,
  cancelOrganisationInvitation,
  getMyOrganisation,
  inviteOrganisationMember,
  removeOrganisationMember,
  type ApplyForOrganisationRequest,
  type CancelInvitationRequest,
  type InviteMemberRequest,
  type MyOrganisationPage,
  type RemoveMemberRequest,
} from '@founders-coffee/server-fns';

export const organisationsApi = {
  apply: (application: ApplyForOrganisationRequest) =>
    applyForOrganisation({ data: application }),
  mine: (slug: string) => getMyOrganisation({ data: { slug } }),
  invite: (request: InviteMemberRequest) =>
    inviteOrganisationMember({ data: request }),
  cancelInvitation: (request: CancelInvitationRequest) =>
    cancelOrganisationInvitation({ data: request }),
  removeMember: (request: RemoveMemberRequest) =>
    removeOrganisationMember({ data: request }),
};

export type {
  ApplyForOrganisationRequest,
  CancelInvitationRequest,
  InviteMemberRequest,
  MyOrganisationPage,
  RemoveMemberRequest,
};
