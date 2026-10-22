import { Link } from '@tanstack/react-router';

import {
  hackathon_submission_building,
  hackathon_submission_captain_only,
  hackathon_submission_closed,
  hackathon_submission_error,
  hackathon_submission_loading,
  hackathon_submission_locked,
  hackathon_submission_no_team,
  hackathon_submission_not_registered,
  hackathon_submission_not_started,
  hackathon_submission_team_link,
  hackathon_submission_title,
  hackathon_submission_waitlisted,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { localizedHackathonTeam } from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import type { SubmissionPageView } from '../api';
import { scheduleMoment } from '../schedule';
import { useSubmissionPage } from '../submission-hooks';
import { HackathonParticipantFrame } from './HackathonParticipantFrame';
import { HackathonParticipantQueryStatus } from './HackathonParticipantQueryStatus';
import { HackathonSubmissionForm } from './HackathonSubmissionForm';

const LINK_CLASS =
  'link link-hover mt-2 block w-fit text-body-sm font-medium text-secondary';

const stageNote = (
  view: SubmissionPageView,
  locale: Locale,
  timeZone: string,
): string => {
  const options = { locale };
  if (view.stage === 'closed') return hackathon_submission_closed({}, options);
  return view.stage === 'building'
    ? hackathon_submission_building(
        {
          date: scheduleMoment(view.submissionDeadlineAt, locale, timeZone),
        },
        options,
      )
    : hackathon_submission_not_started(
        { date: scheduleMoment(view.kickoffAt, locale, timeZone) },
        options,
      );
};

const Entry = ({
  view,
  locale,
  timeZone,
}: {
  view: SubmissionPageView;
  locale: Locale;
  timeZone: string;
}) => {
  const options = { locale };
  if (view.registration !== 'registered')
    return (
      <StatusMessage variant="info" className="mt-6">
        {view.registration === 'waitlisted'
          ? hackathon_submission_waitlisted({}, options)
          : hackathon_submission_not_registered({}, options)}
      </StatusMessage>
    );
  if (!view.team)
    return (
      <>
        <StatusMessage variant="info" className="mt-6">
          {hackathon_submission_no_team({}, options)}
        </StatusMessage>
        <Link
          {...localizedHackathonTeam(locale, view.event.id)}
          className={LINK_CLASS}
        >
          {hackathon_submission_team_link({}, options)}
        </Link>
      </>
    );
  const isLocked = view.entry?.status === 'disqualified';
  return (
    <>
      <p className="mt-3 text-body-sm text-neutral">
        {stageNote(view, locale, timeZone)}
      </p>
      {isLocked ? (
        <StatusMessage variant="warning" className="mt-4">
          {hackathon_submission_locked({}, options)}
        </StatusMessage>
      ) : view.team.isCaptain ? null : (
        <StatusMessage variant="info" className="mt-4">
          {hackathon_submission_captain_only({}, options)}
        </StatusMessage>
      )}
      <HackathonSubmissionForm
        eventId={view.event.id}
        tracks={view.tracks}
        entry={view.entry}
        isReadOnly={
          !view.team.isCaptain || view.stage !== 'building' || isLocked
        }
        locale={locale}
      />
    </>
  );
};

export const HackathonSubmitPage = ({
  eventId,
  locale,
  markets,
}: {
  eventId: string;
  locale: Locale;
  markets: readonly RootMarket[];
}) => {
  const query = useSubmissionPage(eventId);
  const view = query.data;
  const timeZone =
    markets.find((market) => market.code === view?.event.marketCode)
      ?.timezone ?? 'UTC';
  return (
    <HackathonParticipantFrame
      title={hackathon_submission_title({}, { locale })}
      locale={locale}
      markets={markets}
      event={view?.event ?? null}
    >
      {view ? (
        <Entry view={view} locale={locale} timeZone={timeZone} />
      ) : (
        <HackathonParticipantQueryStatus
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorLabel={hackathon_submission_error({}, { locale })}
          loadingLabel={hackathon_submission_loading({}, { locale })}
          locale={locale}
        />
      )}
    </HackathonParticipantFrame>
  );
};
