import {
  acceptOrganisationInvitation,
  applyForOrganisation,
  cancelOrganisationInvitation,
  getMyOrganisation,
  getOrganisationInvitation,
  getOrganisationPage,
  inviteOrganisationMember,
  rejectOrganisationInvitation,
  removeOrganisationMember,
  type ApplyForOrganisationRequest,
  type CancelInvitationRequest,
  type InvitationPage,
  type InviteMemberRequest,
  type MyOrganisationPage,
  type OrganisationPage,
  type RemoveMemberRequest,
} from '@founders-coffee/server-fns';

export const organisationsApi = {
  apply: (application: ApplyForOrganisationRequest) =>
    applyForOrganisation({ data: application }),
  mine: (slug: string) => getMyOrganisation({ data: { slug } }),
  page: (slug: string) => getOrganisationPage({ data: { slug } }),
  invite: (request: InviteMemberRequest) =>
    inviteOrganisationMember({ data: request }),
  cancelInvitation: (request: CancelInvitationRequest) =>
    cancelOrganisationInvitation({ data: request }),
  removeMember: (request: RemoveMemberRequest) =>
    removeOrganisationMember({ data: request }),
  invitation: (invitationId: string) =>
    getOrganisationInvitation({ data: { invitationId } }),
  acceptInvitation: (invitationId: string) =>
    acceptOrganisationInvitation({ data: { invitationId } }),
  declineInvitation: (invitationId: string) =>
    rejectOrganisationInvitation({ data: { invitationId } }),
};

export type {
  ApplyForOrganisationRequest,
  CancelInvitationRequest,
  InvitationPage,
  InviteMemberRequest,
  MyOrganisationPage,
  OrganisationPage,
  RemoveMemberRequest,
};
