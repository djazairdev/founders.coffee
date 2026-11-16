import {
  acceptOrganisationInvitation,
  applyForOrganisation,
  cancelOrganisationInvitation,
  deleteOrganisation,
  getMyOrganisation,
  listMyOrganisations,
  updateOrganisation,
  type UpdateOrganisationRequest,
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
  type OrganisationView,
  type RemoveMemberRequest,
} from '@founders-coffee/server-fns';

import { AppError } from '@founders-coffee/core';

import { putImage } from '../../lib/put-image';

export const organisationsApi = {
  list: (): Promise<readonly OrganisationView[]> =>
    listMyOrganisations({ data: {} }),
  delete: (organisationId: string): Promise<{ readonly id: string }> =>
    deleteOrganisation({ data: { organisationId } }),
  update: (request: UpdateOrganisationRequest): Promise<OrganisationView> =>
    updateOrganisation({ data: request }),
  uploadLogo: async ({
    organisationId,
    file,
  }: {
    organisationId: string;
    file: Blob;
  }) => {
    const result = await putImage(
      `/api/organisations/${organisationId}/logo`,
      file,
    );
    if (!result.ok) throw new AppError(result.error.code, 'Logo upload failed');
  },
  removeLogo: async (organisationId: string) => {
    const response = await fetch(`/api/organisations/${organisationId}/logo`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const body = (await response.json()) as { code?: string };
      throw new AppError(body.code ?? 'photo_failed', 'Logo removal failed');
    }
  },
  apply: (
    application: ApplyForOrganisationRequest,
  ): Promise<OrganisationView> => applyForOrganisation({ data: application }),
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
  OrganisationView,
  UpdateOrganisationRequest,
  ApplyForOrganisationRequest,
  CancelInvitationRequest,
  InvitationPage,
  InviteMemberRequest,
  MyOrganisationPage,
  OrganisationPage,
  RemoveMemberRequest,
};
