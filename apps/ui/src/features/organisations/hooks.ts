import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useHydrationSafeSession } from '../../lib/hydration-safe-session';

import {
  organisationsApi,
  type ApplyForOrganisationRequest,
  type CancelInvitationRequest,
  type InviteMemberRequest,
  type RemoveMemberRequest,
  type UpdateOrganisationRequest,
} from './api';

const MINE = ['organisations', 'mine'] as const;

/** Send an organisation application; the member's own organisations are read again after. */
export const useApplyForOrganisation = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (application: ApplyForOrganisationRequest) =>
      organisationsApi.apply(application),
    onSuccess: () => cache.invalidateQueries({ queryKey: MINE }),
  });
};

/** The signed-in member's own organisation by its slug, with what they may manage in it. */
export const useMyOrganisation = (slug: string) =>
  useQuery({
    queryKey: [...MINE, slug],
    queryFn: () => organisationsApi.mine(slug),
  });

/** A change to an organisation's members or invitations; the page is read again after. */
const useRosterChange = <T>(change: (request: T) => Promise<unknown>) => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: change,
    onSettled: () => cache.invalidateQueries({ queryKey: MINE }),
  });
};

/** Invite someone to the organisation by email. */
export const useInviteMember = () =>
  useRosterChange((request: InviteMemberRequest) =>
    organisationsApi.invite(request),
  );

/** Cancel an invitation still waiting for an answer. */
export const useCancelInvitation = () =>
  useRosterChange((request: CancelInvitationRequest) =>
    organisationsApi.cancelInvitation(request),
  );

/** Remove a member from the organisation. */
export const useRemoveMember = () =>
  useRosterChange((request: RemoveMemberRequest) =>
    organisationsApi.removeMember(request),
  );

const INVITATION = ['organisations', 'invitation'] as const;

/** An invitation addressed to the signed-in member, as its page shows it. */
export const useOrganisationInvitation = (invitationId: string) =>
  useQuery({
    queryKey: [...INVITATION, invitationId],
    queryFn: () => organisationsApi.invitation(invitationId),
  });

/** Accept or decline an invitation; the invitation and the member's organisations are read again. */
export const useAnswerInvitation = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({
      invitationId,
      answer,
    }: {
      invitationId: string;
      answer: 'accept' | 'decline';
    }) =>
      answer === 'accept'
        ? organisationsApi.acceptInvitation(invitationId)
        : organisationsApi.declineInvitation(invitationId),
    onSettled: () =>
      Promise.all([
        cache.invalidateQueries({ queryKey: INVITATION }),
        cache.invalidateQueries({ queryKey: MINE }),
      ]),
  });
};

/** Personal-area organisation data stays scoped to the signed-in identity. */
export const useMyOrganisations = (isSignedIn: boolean) => {
  const auth = useHydrationSafeSession();
  const userId = auth.data?.user.id;
  return useQuery({
    queryKey: [...MINE, 'list', userId],
    queryFn: organisationsApi.list,
    enabled: isSignedIn && !!userId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
};

/** Delete an unused organisation and refresh the member's organisation list. */
export const useDeleteOrganisation = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (organisationId: string) =>
      organisationsApi.delete(organisationId),
    onSuccess: () => cache.invalidateQueries({ queryKey: MINE }),
  });
};

/** Save public organisation fields and refresh every organisation view. */
export const useUpdateOrganisation = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateOrganisationRequest) =>
      organisationsApi.update(request),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['organisations'] }),
  });
};

/** Upload or remove a logo, then reread it from the organisation record. */
export const useOrganisationLogo = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({
      organisationId,
      file,
    }: {
      organisationId: string;
      file: Blob | null;
    }) =>
      file
        ? organisationsApi.uploadLogo({ organisationId, file })
        : organisationsApi.removeLogo(organisationId),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['organisations'] }),
  });
};
