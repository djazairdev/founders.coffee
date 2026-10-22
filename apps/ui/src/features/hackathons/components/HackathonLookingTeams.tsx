import {
  formatNumber,
  hackathon_looking_ask,
  hackathon_looking_asked,
  hackathon_looking_more_teams,
  hackathon_looking_team_size,
  hackathon_looking_teams_empty,
  hackathon_looking_teams_heading,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { LookingForTeamView } from '../api';
import { teamErrorMessage } from '../team-errors';
import { useRequestToJoinTeam } from '../team-hooks';

const HEADING_ID = 'hackathon-looking-teams-heading';

export const HackathonLookingTeams = ({
  eventId,
  teams,
  teamMax,
  hasMore,
  canAsk,
  limit,
  locale,
}: {
  eventId: string;
  teams: LookingForTeamView['teams'];
  teamMax: number;
  hasMore: boolean;
  canAsk: boolean;
  limit: number;
  locale: Locale;
}) => {
  const ask = useRequestToJoinTeam(eventId);
  const number = (value: number) => formatNumber(value, locale);

  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_looking_teams_heading({}, { locale })}
      </h2>
      {teams.length === 0 ? (
        <p className="mt-2 text-body-sm text-neutral">
          {hackathon_looking_teams_empty({}, { locale })}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-base-300 rounded-box border border-base-300">
          {teams.map((team) => {
            const nameId = `hackathon-looking-team-${team.id}`;
            return (
              <li key={team.id} className="grid gap-2 p-3">
                <h3 id={nameId} className="font-medium">
                  <bdi className="break-words">{team.name}</bdi>
                </h3>
                {team.description ? (
                  <p className="whitespace-pre-line text-body-sm">
                    <bdi>{team.description}</bdi>
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-caption text-neutral">
                    {hackathon_looking_team_size(
                      { size: number(team.size), max: number(teamMax) },
                      { locale },
                    )}
                  </p>
                  {team.isRequested ? (
                    <span className="badge badge-ghost badge-sm">
                      {hackathon_looking_asked({}, { locale })}
                    </span>
                  ) : canAsk ? (
                    <Button
                      variant="outline"
                      aria-describedby={nameId}
                      aria-busy={ask.isPending && ask.variables === team.id}
                      onClick={() => {
                        if (!ask.isPending) ask.mutate(team.id);
                      }}
                    >
                      {hackathon_looking_ask({}, { locale })}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {ask.isError ? (
        <StatusMessage variant="error" className="mt-3">
          {teamErrorMessage(ask.error, locale)}
        </StatusMessage>
      ) : null}
      {hasMore ? (
        <p className="mt-2 text-caption text-neutral">
          {hackathon_looking_more_teams({ count: number(limit) }, { locale })}
        </p>
      ) : null}
    </section>
  );
};
