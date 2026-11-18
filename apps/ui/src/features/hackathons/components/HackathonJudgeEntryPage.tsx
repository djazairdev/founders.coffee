import { Link } from '@tanstack/react-router';

import {
  hackathon_judging_entry_back,
  hackathon_judging_entry_missing,
  hackathon_judging_entry_recused,
  hackathon_judging_error,
  hackathon_judging_loading,
  hackathon_judging_title,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { localizedHackathonJudge } from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import type { JudgeEntryPageView } from '../api';
import { useJudgeEntryPage } from '../judging-hooks';
import { HackathonJudgeEntryDetails } from './HackathonJudgeEntryDetails';
import { useFocusAfterChange } from '../../../lib/useFocusAfterChange';
import { HackathonJudgeNextEntry } from './HackathonJudgeNextEntry';
import { HackathonJudgeRecusal } from './HackathonJudgeRecusal';
import { HackathonJudgeScoreForm } from './HackathonJudgeScoreForm';
import { HackathonJudgingNotice } from './HackathonJudgingNotice';
import { HackathonParticipantFrame } from './HackathonParticipantFrame';
import { HackathonParticipantQueryStatus } from './HackathonParticipantQueryStatus';

const Scoring = ({
  view,
  submissionId,
  locale,
}: {
  view: JudgeEntryPageView;
  submissionId: string;
  locale: Locale;
}) => {
  const options = { locale };
  const recused = useFocusAfterChange<HTMLDivElement>(view.isRecused);
  if (view.isRecused)
    return (
      <StatusMessage
        ref={recused}
        tabIndex={-1}
        variant="info"
        className="mt-6"
      >
        {hackathon_judging_entry_recused({}, options)}
      </StatusMessage>
    );
  if (!view.entry)
    return (
      <StatusMessage variant="info" className="mt-6">
        {hackathon_judging_entry_missing({}, options)}
      </StatusMessage>
    );
  return (
    <>
      <HackathonJudgeEntryDetails
        entry={view.entry}
        screenshots={view.screenshots}
        locale={locale}
      />
      <HackathonJudgeScoreForm
        eventId={view.event.id}
        submissionId={submissionId}
        criteria={view.criteria}
        scores={view.scores}
        locale={locale}
      />
      <HackathonJudgeNextEntry
        eventId={view.event.id}
        submissionId={submissionId}
        locale={locale}
      />
      <HackathonJudgeRecusal
        eventId={view.event.id}
        submissionId={submissionId}
        locale={locale}
      />
    </>
  );
};

export const HackathonJudgeEntryPage = ({
  eventId,
  submissionId,
  locale,
  markets,
}: {
  eventId: string;
  submissionId: string;
  locale: Locale;
  markets: readonly RootMarket[];
}) => {
  const query = useJudgeEntryPage(eventId, submissionId);
  const view = query.data;
  const timeZone =
    markets.find((market) => market.code === view?.event.marketCode)
      ?.timezone ?? 'UTC';
  return (
    <HackathonParticipantFrame
      title={hackathon_judging_title({}, { locale })}
      locale={locale}
      markets={markets}
      event={view?.event ?? null}
    >
      <p className="mt-3 text-body-sm">
        <Link
          {...localizedHackathonJudge(locale, eventId)}
          className="link link-hover"
        >
          {hackathon_judging_entry_back({}, { locale })}
        </Link>
      </p>
      {!view ? (
        <HackathonParticipantQueryStatus
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorLabel={hackathon_judging_error({}, { locale })}
          loadingLabel={hackathon_judging_loading({}, { locale })}
          locale={locale}
        />
      ) : view.isJudge && view.stage === 'judging' ? (
        <Scoring
          key={submissionId}
          view={view}
          submissionId={submissionId}
          locale={locale}
        />
      ) : (
        <HackathonJudgingNotice
          view={view}
          locale={locale}
          timeZone={timeZone}
        />
      )}
    </HackathonParticipantFrame>
  );
};
