import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  organisationsApi,
  type ApplyForOrganisationRequest,
  type CancelInvitationRequest,
  type InviteMemberRequest,
  type RemoveMemberRequest,
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
