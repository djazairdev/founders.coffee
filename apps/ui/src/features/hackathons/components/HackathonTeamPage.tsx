import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import {
  hackathon_team_back,
  hackathon_team_deadline,
  hackathon_team_error,
  hackathon_team_joined,
  hackathon_team_loading,
  hackathon_team_locked,
  hackathon_team_not_found,
  hackathon_team_not_registered,
  hackathon_team_size,
  hackathon_team_title,
  hackathon_team_waitlisted,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import { localizedEvent } from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import type { TeamPageView } from '../api';
import { isHackathonMissing, isHackathonsDisabled } from '../errors';
import { scheduleMoment } from '../schedule';
import { useTeamPage } from '../team-hooks';
import { HackathonsUnavailable } from './HackathonsUnavailable';
import { HackathonTeamCreateForm } from './HackathonTeamCreateForm';
import { HackathonTeamInviteLink } from './HackathonTeamInviteLink';
import { HackathonTeamJoin } from './HackathonTeamJoin';
import { HackathonTeamMembers } from './HackathonTeamMembers';
import { HackathonTeamOwnRequests } from './HackathonTeamOwnRequests';
import { HackathonTeamRequests } from './HackathonTeamRequests';

const Shell = ({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) => (
  <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
    <h1 className="font-display text-h3">
      {hackathon_team_title({}, { locale })}
    </h1>
    {children}
  </div>
);

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
  if (!view)
    return (
      <Shell locale={locale}>
        {query.isError ? (
          isHackathonsDisabled(query.error) ? (
            <div className="mt-6">
              <HackathonsUnavailable locale={locale} />
            </div>
          ) : isHackathonMissing(query.error) ? (
            <StatusMessage variant="warning" className="mt-6">
              {hackathon_team_not_found({}, { locale })}
            </StatusMessage>
          ) : (
            <StatusMessage
              variant="error"
              className="mt-6"
              action={
                <Button variant="outline" onClick={() => void query.refetch()}>
                  {retry({}, { locale })}
                </Button>
              }
            >
              {hackathon_team_error({}, { locale })}
            </StatusMessage>
          )
        ) : (
          <LoadingStatus
            className="mt-6"
            label={hackathon_team_loading({}, { locale })}
          />
        )}
      </Shell>
    );

  const market = markets.find((item) => item.code === view.event.marketCode);
  const timeZone = market?.timezone ?? 'UTC';
  return (
    <Shell locale={locale}>
      {market ? (
        <Link
          {...localizedEvent(locale, market.slug, view.event.slug)}
          className="link link-hover mt-1 inline-block text-body-sm text-neutral"
        >
          <bdi>{view.event.title}</bdi>
          <span className="sr-only">
            {' '}
            {hackathon_team_back({}, { locale })}
          </span>
        </Link>
      ) : null}
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
    </Shell>
  );
};
