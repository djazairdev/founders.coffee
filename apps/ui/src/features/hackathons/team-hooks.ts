import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  teamsApi,
  type LookingForTeamView,
  type TeamInviteCreated,
  type TeamJoined,
  type TeamPageView,
} from './api';

const TEAM = ['hackathons', 'team'] as const;

/** The signed-in member's team page for a hackathon (B-TEAM-07). */
export const useTeamPage = (eventId: string) =>
  useQuery<TeamPageView>({
    queryKey: [...TEAM, eventId],
    queryFn: () => teamsApi.page(eventId),
  });

/**
 * The teams and participants looking for each other (B-TEAM-08), kept under the team page's key so
 * every team change reads it again too.
 */
export const useLookingForTeam = (eventId: string) =>
  useQuery<LookingForTeamView>({
    queryKey: [...TEAM, eventId, 'looking'],
    queryFn: () => teamsApi.looking(eventId),
  });

/** A team change that reads the team pages again once it lands, whether it worked or not. */
const useTeamChange = <Input, Output>(
  eventId: string,
  change: (input: Input) => Promise<Output>,
) => {
  const cache = useQueryClient();
  return useMutation<Output, Error, Input>({
    mutationFn: change,
    onSettled: () => cache.invalidateQueries({ queryKey: [...TEAM, eventId] }),
  });
};

/** Start a team with the member as its captain. */
export const useCreateTeam = (eventId: string) =>
  useTeamChange(
    eventId,
    (input: {
      readonly name: string;
      readonly description: string | null;
      readonly isLookingForMembers: boolean;
    }) => teamsApi.create({ eventId, ...input }),
  );

/** Give the captain's team a new invite link, answered once with its token. */
export const useCreateTeamInvite = (eventId: string) =>
  useTeamChange<void, TeamInviteCreated>(eventId, () =>
    teamsApi.createInvite({ eventId }),
  );

/** Turn the captain's team's invite link off. */
export const useRevokeTeamInvite = (eventId: string) =>
  useTeamChange<void, unknown>(eventId, () =>
    teamsApi.revokeInvite({ eventId }),
  );

/** Join the team an invite link is for. */
export const useJoinTeam = (eventId: string) =>
  useTeamChange<string, TeamJoined>(eventId, (token) => teamsApi.join(token));

/** Accept or decline a request to join the captain's team. */
export const useAnswerTeamRequest = (eventId: string) =>
  useTeamChange(
    eventId,
    (input: {
      readonly requestId: string;
      readonly decision: 'accept' | 'decline';
    }) => teamsApi.answerRequest({ eventId, ...input }),
  );

/** Ask to join a team. */
export const useRequestToJoinTeam = (eventId: string) =>
  useTeamChange(eventId, (teamId: string) =>
    teamsApi.request({ eventId, teamId }),
  );

/** Withdraw the member's own request to join a team. */
export const useCancelTeamRequest = (eventId: string) =>
  useTeamChange(eventId, (requestId: string) =>
    teamsApi.cancelRequest({ eventId, requestId }),
  );

/** Leave the member's team. */
export const useLeaveTeam = (eventId: string) =>
  useTeamChange<void, unknown>(eventId, () => teamsApi.leave({ eventId }));

/** Make another member of the captain's team its captain. */
export const usePassCaptaincy = (eventId: string) =>
  useTeamChange(eventId, (memberId: string) =>
    teamsApi.passCaptaincy({ eventId, memberId }),
  );

/** Remove a member from the captain's team. */
export const useRemoveTeamMember = (eventId: string) =>
  useTeamChange(eventId, (memberId: string) =>
    teamsApi.removeMember({ eventId, memberId }),
  );
