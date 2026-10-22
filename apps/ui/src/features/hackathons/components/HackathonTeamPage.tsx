import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  hackathon_team_deadline,
  hackathon_team_error,
  hackathon_team_find,
  hackathon_team_joined,
  hackathon_team_loading,
  hackathon_team_locked,
  hackathon_team_not_registered,
  hackathon_team_project_link,
  hackathon_team_size,
  hackathon_team_title,
  hackathon_team_waitlisted,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import {
  localizedHackathonLooking,
  localizedHackathonSubmit,
} from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import type { TeamPageView } from '../api';
import { scheduleMoment } from '../schedule';
import { useTeamPage } from '../team-hooks';
import { HackathonTeamCreateForm } from './HackathonTeamCreateForm';
import { HackathonParticipantFrame } from './HackathonParticipantFrame';
import { HackathonTeamInviteLink } from './HackathonTeamInviteLink';
import { HackathonTeamJoin } from './HackathonTeamJoin';
import { HackathonTeamMembers } from './HackathonTeamMembers';
import { HackathonTeamOwnRequests } from './HackathonTeamOwnRequests';
import { HackathonParticipantQueryStatus } from './HackathonParticipantQueryStatus';
import { HackathonTeamRequests } from './HackathonTeamRequests';

const LINK_CLASS =
  'link link-hover mt-2 block w-fit text-body-sm font-medium text-secondary';

const Team = ({
  view,
  joinToken,
  isJustJoined,
  onJoined,
  locale,
  timeZone,
}: {
  view: TeamPageView;
  joinToken: string | undefined;
  isJustJoined: boolean;
  onJoined: (teamId: string) => void;
  locale: Locale;
  timeZone: string;
}) => {
  const { team, canChangeTeams: canChange } = view;
  const eventId = view.event.id;
  if (view.registration !== 'registered')
    return (
      <StatusMessage variant="info" className="mt-6">
        {view.registration === 'waitlisted'
          ? hackathon_team_waitlisted({}, { locale })
          : hackathon_team_not_registered({}, { locale })}
      </StatusMessage>
    );
  if (!team)
    return (
      <>
        {joinToken && canChange ? (
          <HackathonTeamJoin
            eventId={eventId}
            token={joinToken}
            locale={locale}
            onJoined={onJoined}
          />
        ) : null}
        {canChange ? (
          <HackathonTeamCreateForm eventId={eventId} locale={locale} />
        ) : null}
        <HackathonTeamOwnRequests
          eventId={eventId}
          requests={view.ownRequests}
          canChange={canChange}
          locale={locale}
        />
      </>
    );
  return (
    <>
      {isJustJoined ? (
        <StatusMessage variant="success" className="mt-6">
          {hackathon_team_joined({}, { locale })}
        </StatusMessage>
      ) : null}
      <section className="mt-6 rounded-box bg-base-200 p-4">
        <h2 className="font-display text-h4">
          <bdi className="break-words">{team.name}</bdi>
        </h2>
        {team.description ? (
          <p className="mt-1 whitespace-pre-line text-body-sm">
            <bdi>{team.description}</bdi>
          </p>
        ) : null}
      </section>
      <HackathonTeamMembers
        eventId={eventId}
        team={team}
        viewerId={view.viewerId}
        canChange={canChange}
        locale={locale}
      />
      {team.isCaptain && canChange ? (
        <>
          <HackathonTeamInviteLink
            eventId={eventId}
            expiresAt={team.inviteExpiresAt}
            locale={locale}
            timeZone={timeZone}
          />
          <HackathonTeamRequests
            eventId={eventId}
            requests={team.requests}
            locale={locale}
          />
        </>
      ) : null}
    </>
  );
};

export const HackathonTeamPage = ({
  eventId,
  locale,
  markets,
  joinToken,
  onTokenUsed,
}: {
  eventId: string;
  locale: Locale;
  markets: readonly RootMarket[];
  joinToken: string | undefined;
  onTokenUsed: () => void;
}) => {
  const query = useTeamPage(eventId);
  const [joinedTeamId, setJoinedTeamId] = useState<string | null>(null);
  const view = query.data;
  const title = hackathon_team_title({}, { locale });
  if (!view)
    return (
      <HackathonParticipantFrame
        title={title}
        locale={locale}
        markets={markets}
        event={null}
      >
        <HackathonParticipantQueryStatus
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorLabel={hackathon_team_error({}, { locale })}
          loadingLabel={hackathon_team_loading({}, { locale })}
          locale={locale}
        />
      </HackathonParticipantFrame>
    );

  const timeZone =
    markets.find((item) => item.code === view.event.marketCode)?.timezone ??
    'UTC';
  return (
    <HackathonParticipantFrame
      title={title}
      locale={locale}
      markets={markets}
      event={view.event}
    >
      <p className="mt-3 text-body-sm text-neutral">
        {view.canChangeTeams
          ? hackathon_team_deadline(
              {
                date: scheduleMoment(
                  view.submissionDeadlineAt,
                  locale,
                  timeZone,
                ),
              },
              { locale },
            )
          : hackathon_team_locked({}, { locale })}{' '}
        {hackathon_team_size(
          { min: view.teamMin, max: view.teamMax },
          { locale },
        )}
      </p>
      {view.team ? (
        <Link
          {...localizedHackathonSubmit(locale, eventId)}
          className={LINK_CLASS}
        >
          {hackathon_team_project_link({}, { locale })}
        </Link>
      ) : null}
      {view.registration === 'registered' ? (
        <Link
          {...localizedHackathonLooking(locale, eventId)}
          className={LINK_CLASS}
        >
          {hackathon_team_find({}, { locale })}
        </Link>
      ) : null}
      <Team
        view={view}
        joinToken={joinToken}
        isJustJoined={joinedTeamId !== null && view.team?.id === joinedTeamId}
        onJoined={(teamId) => {
          setJoinedTeamId(teamId);
          onTokenUsed();
        }}
        locale={locale}
        timeZone={timeZone}
      />
    </HackathonParticipantFrame>
  );
};
