import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

import {
  formatNumber,
  hackathon_participant_disqualified,
  hackathon_participant_registered,
  hackathon_participant_waitlisted,
  hackathon_participant_withdrawn,
  hackathon_participants_attendance,
  hackathon_participants_empty,
  hackathon_participants_error,
  hackathon_participants_heading,
  hackathon_participants_loading,
  hackathon_participants_name,
  hackathon_participants_no_team,
  hackathon_participants_status,
  hackathon_participants_team,
  hackathon_participants_truncated,
  hackathon_team_unnamed,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import type { HackathonParticipantsView } from '../api';
import { ATTENDANCE_LABELS } from '../detail-labels';
import { useHackathonParticipants } from '../hooks';
import { ORGANISER_TABLE_FEATURES } from '../organiser-table';
import { HackathonOrganiserTable } from './HackathonOrganiserTable';

type Participant = HackathonParticipantsView['participants'][number];

const HEADING_ID = 'hackathon-participants-heading';

const STATUS = {
  registered: hackathon_participant_registered,
  waitlisted: hackathon_participant_waitlisted,
  withdrawn: hackathon_participant_withdrawn,
  disqualified: hackathon_participant_disqualified,
} as const satisfies Record<Participant['status'], unknown>;

const helper = createColumnHelper<
  typeof ORGANISER_TABLE_FEATURES,
  Participant
>();

const columnsFor = (locale: Locale) => {
  const options = { locale };
  return helper.columns([
    helper.accessor('name', {
      header: () => hackathon_participants_name({}, options),
      cell: (name) => (
        <bdi className="break-words">
          {name.getValue() || hackathon_team_unnamed({}, options)}
        </bdi>
      ),
    }),
    helper.accessor('attendanceMode', {
      header: () => hackathon_participants_attendance({}, options),
      cell: (mode) => ATTENDANCE_LABELS[mode.getValue()]({}, options),
    }),
    helper.accessor('status', {
      header: () => hackathon_participants_status({}, options),
      cell: (status) => STATUS[status.getValue()]({}, options),
    }),
    helper.accessor('teamName', {
      header: () => hackathon_participants_team({}, options),
      cell: (team) => {
        const name = team.getValue();
        return name ? (
          <bdi className="break-words">{name}</bdi>
        ) : (
          <span className="text-neutral">
            {hackathon_participants_no_team({}, options)}
          </span>
        );
      },
    }),
  ]);
};

export const HackathonParticipantsList = ({
  eventId,
  locale,
}: {
  eventId: string;
  locale: Locale;
}) => {
  const options = { locale };
  const query = useHackathonParticipants(eventId);
  const columns = useMemo(() => columnsFor(locale), [locale]);
  const view = query.data;
  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_participants_heading({}, options)}
      </h2>
      {view ? (
        view.participants.length === 0 ? (
          <p className="mt-2 text-body-sm text-neutral">
            {hackathon_participants_empty({}, options)}
          </p>
        ) : (
          <>
            <HackathonOrganiserTable
              columns={columns}
              data={view.participants}
              headingId={HEADING_ID}
              locale={locale}
            />
            {view.isTruncated ? (
              <StatusMessage variant="info" className="mt-3">
                {hackathon_participants_truncated(
                  {
                    count: formatNumber(view.participants.length, locale),
                  },
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
          {hackathon_participants_error({}, options)}
        </StatusMessage>
      ) : (
        <LoadingStatus
          className="mt-3"
          label={hackathon_participants_loading({}, options)}
        />
      )}
    </section>
  );
};
