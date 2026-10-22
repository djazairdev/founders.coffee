import { Link } from '@tanstack/react-router';

import {
  hackathon_looking_error,
  hackathon_looking_loading,
  hackathon_looking_not_registered,
  hackathon_looking_title,
  hackathon_looking_waitlisted,
  hackathon_team_error_in_team,
  hackathon_team_locked,
  hackathon_team_title,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { localizedHackathonTeam } from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import type { LookingForTeamView } from '../api';
import { useLookingForTeam } from '../team-hooks';
import { HackathonLookingParticipants } from './HackathonLookingParticipants';
import { HackathonLookingTeams } from './HackathonLookingTeams';
import { HackathonTeamFrame } from './HackathonTeamFrame';
import { HackathonTeamQueryStatus } from './HackathonTeamQueryStatus';

const Lists = ({
  view,
  locale,
}: {
  view: LookingForTeamView;
  locale: Locale;
}) => {
  if (view.registration !== 'registered')
    return (
      <StatusMessage variant="info" className="mt-6">
        {view.registration === 'waitlisted'
          ? hackathon_looking_waitlisted({}, { locale })
          : hackathon_looking_not_registered({}, { locale })}
      </StatusMessage>
    );
  const note = !view.canChangeTeams
    ? hackathon_team_locked({}, { locale })
    : view.isInTeam
      ? hackathon_team_error_in_team({}, { locale })
      : null;
  return (
    <>
      {note ? (
        <StatusMessage variant="info" className="mt-6">
          {note}
        </StatusMessage>
      ) : null}
      <HackathonLookingTeams
        eventId={view.event.id}
        teams={view.teams}
        teamMax={view.teamMax}
        hasMore={view.hasMoreTeams}
        canAsk={note === null}
        limit={view.listLimit}
        locale={locale}
      />
      <HackathonLookingParticipants
        participants={view.participants}
        hasMore={view.hasMoreParticipants}
        limit={view.listLimit}
        locale={locale}
      />
    </>
  );
};

export const HackathonLookingPage = ({
  eventId,
  locale,
  markets,
}: {
  eventId: string;
  locale: Locale;
  markets: readonly RootMarket[];
}) => {
  const query = useLookingForTeam(eventId);
  const view = query.data;
  return (
    <HackathonTeamFrame
      title={hackathon_looking_title({}, { locale })}
      locale={locale}
      markets={markets}
      event={view?.event ?? null}
    >
      {view ? (
        <>
          <Link
            {...localizedHackathonTeam(locale, eventId)}
            className="link link-hover mt-2 block w-fit text-body-sm font-medium text-secondary"
          >
            {hackathon_team_title({}, { locale })}
          </Link>
          <Lists view={view} locale={locale} />
        </>
      ) : (
        <HackathonTeamQueryStatus
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorLabel={hackathon_looking_error({}, { locale })}
          loadingLabel={hackathon_looking_loading({}, { locale })}
          locale={locale}
        />
      )}
    </HackathonTeamFrame>
  );
};
