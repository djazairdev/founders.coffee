import {
  hackathon_judging_closed,
  hackathon_judging_error,
  hackathon_judging_loading,
  hackathon_judging_not_judge,
  hackathon_judging_not_started,
  hackathon_judging_open,
  hackathon_judging_title,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import type { RootMarket } from '../../markets/api';
import type { JudgePageView } from '../api';
import { useJudgePage } from '../judging-hooks';
import { scheduleMoment } from '../schedule';
import { HackathonJudgeEntries } from './HackathonJudgeEntries';
import { HackathonParticipantFrame } from './HackathonParticipantFrame';
import { HackathonParticipantQueryStatus } from './HackathonParticipantQueryStatus';

const Judging = ({
  view,
  locale,
  timeZone,
}: {
  view: JudgePageView;
  locale: Locale;
  timeZone: string;
}) => {
  const options = { locale };
  if (!view.isJudge)
    return (
      <StatusMessage variant="info" className="mt-6">
        {hackathon_judging_not_judge({}, options)}
      </StatusMessage>
    );
  if (view.stage === 'closed')
    return (
      <StatusMessage variant="info" className="mt-6">
        {hackathon_judging_closed({}, options)}
      </StatusMessage>
    );
  if (view.stage === 'not_started')
    return (
      <p className="mt-3 text-body-sm text-neutral">
        {hackathon_judging_not_started(
          {
            date: scheduleMoment(view.submissionDeadlineAt, locale, timeZone),
          },
          options,
        )}
      </p>
    );
  return (
    <>
      <p className="mt-3 text-body-sm text-neutral">
        {hackathon_judging_open(
          { date: scheduleMoment(view.judgingEndsAt, locale, timeZone) },
          options,
        )}
      </p>
      <HackathonJudgeEntries
        entries={view.entries}
        progress={view.progress}
        locale={locale}
      />
    </>
  );
};

export const HackathonJudgePage = ({
  eventId,
  locale,
  markets,
}: {
  eventId: string;
  locale: Locale;
  markets: readonly RootMarket[];
}) => {
  const query = useJudgePage(eventId);
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
      {view ? (
        <Judging view={view} locale={locale} timeZone={timeZone} />
      ) : (
        <HackathonParticipantQueryStatus
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorLabel={hackathon_judging_error({}, { locale })}
          loadingLabel={hackathon_judging_loading({}, { locale })}
          locale={locale}
        />
      )}
    </HackathonParticipantFrame>
  );
};
