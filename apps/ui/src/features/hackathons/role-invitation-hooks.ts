import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  answerHackathonJudgeInvite,
  answerHackathonMentorInvite,
  createHackathonJudgeInvite,
  createHackathonMentorInvite,
  getHackathonPlaceInvite,
  listHackathonJudges,
  listHackathonMentors,
  removeHackathonJudge,
  removeHackathonMentor,
  type JudgeInviteAnswered,
  type OrganiserJudgeView,
  type OrganiserMentorView,
} from './api';
import type {
  HackathonRole,
  MentorNote,
  RoleInvitation,
} from './role-invitations';

export type RolePlace = OrganiserJudgeView | OrganiserMentorView;

export const useManageHackathonRole = (
  eventId: string,
  role: HackathonRole,
) => {
  const cache = useQueryClient();
  const key = ['hackathons', 'draft', eventId, 'role', role] as const;
  const roster = useQuery<readonly RolePlace[]>({
    queryKey: key,
    queryFn: () =>
      role === 'judge'
        ? listHackathonJudges({ data: { eventId } })
        : listHackathonMentors({ data: { eventId } }),
    refetchOnWindowFocus: 'always',
  });
  const create = useMutation({
    gcTime: 0,
    mutationFn: async () => {
      if (role === 'judge') {
        const { judgeId, token } = await createHackathonJudgeInvite({
          data: { eventId },
        });
        return { id: judgeId, token };
      }
      const { mentorId, token } = await createHackathonMentorInvite({
        data: { eventId },
      });
      return { id: mentorId, token };
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: async (placeId: string) => {
      if (role === 'judge')
        await removeHackathonJudge({ data: { eventId, judgeId: placeId } });
      else
        await removeHackathonMentor({ data: { eventId, mentorId: placeId } });
    },
    onSuccess: async (_result, placeId) => {
      if (create.data?.id === placeId) create.reset();
      await Promise.all([
        cache.invalidateQueries({ queryKey: key }),
        cache.invalidateQueries({
          queryKey: ['hackathons', 'draft', eventId, 'dashboard'],
        }),
        cache.invalidateQueries({
          queryKey: ['hackathons', 'results', eventId],
        }),
      ]);
    },
  });
  return { roster, create, remove };
};

export const useHackathonRoleInvitation = (
  request: RoleInvitation | undefined,
) =>
  useQuery({
    queryKey: ['hackathons', 'role-invite', request],
    queryFn: request
      ? () => getHackathonPlaceInvite({ data: request })
      : skipToken,
    retry: false,
    gcTime: 0,
  });

type Answer =
  | {
      readonly role: 'judge';
      readonly token: string;
      readonly answer: 'accept' | 'decline';
    }
  | {
      readonly role: 'mentor';
      readonly token: string;
      readonly answer: 'decline';
    }
  | {
      readonly role: 'mentor';
      readonly token: string;
      readonly answer: 'accept';
      readonly note: MentorNote;
    };

export const useAnswerHackathonRoleInvitation = () =>
  useMutation<JudgeInviteAnswered, Error, Answer>({
    gcTime: 0,
    mutationFn: (input: Answer) => {
      if (input.role === 'judge')
        return answerHackathonJudgeInvite({
          data: { token: input.token, answer: input.answer },
        });
      const data =
        input.answer === 'accept'
          ? { token: input.token, answer: input.answer, note: input.note }
          : { token: input.token, answer: input.answer };
      return answerHackathonMentorInvite({ data });
    },
  });
