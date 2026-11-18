import { Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import {
  HACKATHON_MENTOR_HELPS_WITH_MAX,
  HACKATHON_MENTOR_OFFICE_HOURS_MAX,
} from '@founders-coffee/core';
import {
  hackathon_go_judging,
  hackathon_mentor_helps_with,
  hackathon_mentor_office_hours,
  hackathon_role_accepted,
  hackathon_role_invalid,
  hackathon_role_judge_prompt,
  hackathon_role_mentor_note_required,
  hackathon_role_mentor_prompt,
  hackathon_role_invitation_title,
  loading,
  org_invitation_accept,
  org_invitation_decline,
  org_invitation_declined_body,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  Input,
  LoadingStatus,
  StatusMessage,
} from '@founders-coffee/ui';

import { localizedHackathonJudge } from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import type { PlaceInviteView } from '../api';
import {
  useAnswerHackathonRoleInvitation,
  useHackathonRoleInvitation,
} from '../role-invitation-hooks';
import { roleInvitationError } from '../role-invitation-labels';
import { parseMentorNote, type RoleInvitation } from '../role-invitations';
import { HackathonParticipantFrame } from './HackathonParticipantFrame';

type Answered = {
  readonly request: RoleInvitation;
  readonly invitation: PlaceInviteView;
  readonly status: 'accepted' | 'declined';
};

export const HackathonRoleInvitationPage = ({
  request,
  locale,
  markets,
  onAnswered,
}: {
  request: RoleInvitation | undefined;
  locale: Locale;
  markets: readonly RootMarket[];
  onAnswered: () => void;
}) => {
  const query = useHackathonRoleInvitation(request);
  const answer = useAnswerHackathonRoleInvitation();
  const [response, setResponse] = useState<Answered>();
  const [helpsWith, setHelpsWith] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [isNoteInvalid, setIsNoteInvalid] = useState(false);
  const options = { locale };
  const answered =
    request && request.token !== response?.request.token ? undefined : response;
  const invitation = answered?.invitation ?? query.data;
  const role = answered?.request.role ?? request?.role;
  const isAccepted = answered?.status === 'accepted' || invitation?.isAccepted;
  const isDeclined = answered?.status === 'declined';

  const reply = (choice: 'accept' | 'decline') => {
    if (!request || !invitation || answer.isPending) return;
    const saveResponse = ({ status }: Pick<Answered, 'status'>) => {
      setResponse({ request, invitation, status });
      onAnswered();
    };
    setIsNoteInvalid(false);
    if (request.role === 'judge' || choice === 'decline') {
      const { role, token } = request;
      if (role === 'judge')
        answer.mutate(
          { role, token, answer: choice },
          { onSuccess: saveResponse },
        );
      else
        answer.mutate(
          { role, token, answer: 'decline' },
          { onSuccess: saveResponse },
        );
      return;
    }
    const note = parseMentorNote(helpsWith, officeHours);
    if (!note.success) {
      setIsNoteInvalid(true);
      document.getElementById('hackathon-mentor-helps-with')?.focus();
      return;
    }
    answer.mutate(
      { ...request, role: 'mentor', answer: 'accept', note: note.data },
      { onSuccess: saveResponse },
    );
  };

  const accept = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reply('accept');
  };

  return (
    <HackathonParticipantFrame
      title={hackathon_role_invitation_title({}, options)}
      locale={locale}
      markets={markets}
      event={invitation && !invitation.isDraft ? invitation : null}
    >
      <div className="mt-6 grid gap-4">
        {invitation?.isDraft ? (
          <p className="font-medium">
            <bdi>{invitation.title}</bdi>
          </p>
        ) : null}
        {isAccepted && invitation ? (
          <>
            <StatusMessage variant="success">
              {hackathon_role_accepted({}, options)}
            </StatusMessage>
            {role === 'judge' ? (
              <Link
                {...localizedHackathonJudge(locale, invitation.eventId)}
                className="link link-hover w-fit font-medium text-secondary"
              >
                {hackathon_go_judging({}, options)}
              </Link>
            ) : null}
          </>
        ) : isDeclined ? (
          <StatusMessage variant="info">
            {org_invitation_declined_body({}, options)}
          </StatusMessage>
        ) : invitation && role ? (
          <form onSubmit={accept} className="grid gap-4" noValidate>
            <p>
              {(role === 'judge'
                ? hackathon_role_judge_prompt
                : hackathon_role_mentor_prompt)({}, options)}
            </p>
            {role === 'mentor' ? (
              <div className="grid gap-2">
                <label
                  htmlFor="hackathon-mentor-helps-with"
                  className="text-label"
                >
                  {hackathon_mentor_helps_with({}, options)}
                </label>
                <Input
                  id="hackathon-mentor-helps-with"
                  dir="auto"
                  required
                  aria-invalid={isNoteInvalid}
                  value={helpsWith}
                  maxLength={HACKATHON_MENTOR_HELPS_WITH_MAX}
                  onChange={(event) => setHelpsWith(event.target.value)}
                />
                {isNoteInvalid ? (
                  <p className="text-body-sm text-error">
                    {hackathon_role_mentor_note_required({}, options)}
                  </p>
                ) : null}
                <label
                  htmlFor="hackathon-mentor-office-hours"
                  className="text-label"
                >
                  {hackathon_mentor_office_hours({}, options)}
                </label>
                <Input
                  id="hackathon-mentor-office-hours"
                  dir="auto"
                  value={officeHours}
                  maxLength={HACKATHON_MENTOR_OFFICE_HOURS_MAX}
                  onChange={(event) => setOfficeHours(event.target.value)}
                />
              </div>
            ) : null}
            {answer.isError ? (
              <StatusMessage variant="error">
                {roleInvitationError(answer.error, locale)}
              </StatusMessage>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={answer.isPending}>
                {org_invitation_accept({}, options)}
              </Button>
              <Button
                variant="outline"
                disabled={answer.isPending}
                onClick={() => reply('decline')}
              >
                {org_invitation_decline({}, options)}
              </Button>
            </div>
          </form>
        ) : request && query.isPending ? (
          <LoadingStatus label={loading({}, options)} />
        ) : (
          <StatusMessage variant="warning">
            {request && query.error
              ? roleInvitationError(query.error, locale)
              : hackathon_role_invalid({}, options)}
          </StatusMessage>
        )}
      </div>
    </HackathonParticipantFrame>
  );
};
