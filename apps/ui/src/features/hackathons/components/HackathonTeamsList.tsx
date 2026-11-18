import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

import {
  formatNumber,
  hackathon_participant_disqualified,
  hackathon_team_unnamed,
  hackathon_teams_list_captain,
  hackathon_teams_list_empty,
  hackathon_teams_list_error,
  hackathon_teams_list_heading,
  hackathon_teams_list_loading,
  hackathon_teams_list_members,
  hackathon_teams_list_no_track,
  hackathon_teams_list_status_draft,
  hackathon_teams_list_status_none,
  hackathon_teams_list_status_submitted,
  hackathon_teams_list_submission,
  hackathon_teams_list_team,
  hackathon_teams_list_track,
  hackathon_teams_list_truncated,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  IsolatedValue,
  LoadingStatus,
  StatusMessage,
} from '@founders-coffee/ui';

import type { HackathonTeamsView } from '../api';
import { useHackathonTeams } from '../hooks';
import { ORGANISER_TABLE_FEATURES } from '../organiser-table';
import { HackathonOrganiserTable } from './HackathonOrganiserTable';

type Team = HackathonTeamsView['teams'][number];

const HEADING_ID = 'hackathon-teams-list-heading';

const SUBMISSION = {
  draft: hackathon_teams_list_status_draft,
  submitted: hackathon_teams_list_status_submitted,
  disqualified: hackathon_participant_disqualified,
} as const satisfies Record<NonNullable<Team['submissionStatus']>, unknown>;

const helper = createColumnHelper<typeof ORGANISER_TABLE_FEATURES, Team>();

const MemberList = ({
  members,
  locale,
}: {
  members: Team['members'];
  locale: Locale;
}) => {
  const options = { locale };
  return (
    <ul className="grid gap-0.5">
      {members.map((member) => {
        const name = member.name || hackathon_team_unnamed({}, options);
        return (
          <li key={member.userId} className="break-words">
            {member.isCaptain ? (
              <IsolatedValue
                value={name}
                message={(isolated) =>
                  hackathon_teams_list_captain({ name: isolated }, options)
                }
              />
            ) : (
              <bdi>{name}</bdi>
            )}
          </li>
        );
      })}
    </ul>
  );
};

const columnsFor = (locale: Locale) => {
  const options = { locale };
  return helper.columns([
    helper.accessor('name', {
      header: () => hackathon_teams_list_team({}, options),
      cell: (name) => <bdi className="break-words">{name.getValue()}</bdi>,
    }),
    helper.accessor('members', {
      header: () => hackathon_teams_list_members({}, options),
      cell: (members) => (
        <MemberList members={members.getValue()} locale={locale} />
      ),
    }),
    helper.accessor('trackTitle', {
      header: () => hackathon_teams_list_track({}, options),
      cell: (track) => {
        const title = track.getValue();
        return title ? (
          <bdi className="break-words">{title}</bdi>
        ) : (
          <span className="text-neutral">
            {hackathon_teams_list_no_track({}, options)}
          </span>
        );
      },
    }),
    helper.accessor('submissionStatus', {
      header: () => hackathon_teams_list_submission({}, options),
      cell: (status) => {
        const value = status.getValue();
        return value
          ? SUBMISSION[value]({}, options)
          : hackathon_teams_list_status_none({}, options);
      },
    }),
  ]);
};

export const HackathonTeamsList = ({
  eventId,
  locale,
}: {
  eventId: string;
  locale: Locale;
}) => {
  const options = { locale };
  const query = useHackathonTeams(eventId);
  const columns = useMemo(() => columnsFor(locale), [locale]);
  const view = query.data;
  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_teams_list_heading({}, options)}
      </h2>
      {view ? (
        view.teams.length === 0 ? (
          <p className="mt-2 text-body-sm text-neutral">
            {hackathon_teams_list_empty({}, options)}
          </p>
        ) : (
          <>
            <HackathonOrganiserTable
              columns={columns}
              data={view.teams}
              headingId={HEADING_ID}
              locale={locale}
            />
            {view.isTruncated ? (
              <StatusMessage variant="info" className="mt-3">
                {hackathon_teams_list_truncated(
                  { count: formatNumber(view.teams.length, locale) },
                  options,
                )}
              </StatusMessage>
            ) : null}
          </>
        )
      ) : query.isError ? (
        <StatusMessage
          variant="error"
          className="mt-3"
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              {retry({}, options)}
            </Button>
          }
        >
          {hackathon_teams_list_error({}, options)}
        </StatusMessage>
      ) : (
        <LoadingStatus
          className="mt-3"
          label={hackathon_teams_list_loading({}, options)}
        />
      )}
    </section>
  );
};
