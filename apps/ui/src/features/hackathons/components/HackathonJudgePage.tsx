import {
  hackathon_judging_error,
  hackathon_judging_loading,
  hackathon_judging_open,
  hackathon_judging_title,
  type Locale,
} from '@founders-coffee/i18n';

import type { RootMarket } from '../../markets/api';
import type { JudgePageView } from '../api';
import { useJudgePage } from '../judging-hooks';
import { scheduleMoment } from '../schedule';
import { HackathonJudgeEntries } from './HackathonJudgeEntries';
import { HackathonJudgingNotice } from './HackathonJudgingNotice';
import { HackathonParticipantFrame } from './HackathonParticipantFrame';
import { HackathonParticipantQueryStatus } from './HackathonParticipantQueryStatus';
import { HackathonCertificates } from './HackathonCertificates';
import { HackathonRecordOffer } from './HackathonRecordOffer';

const Judging = ({
  view,
  locale,
  timeZone,
}: {
  view: JudgePageView;
  locale: Locale;
  timeZone: string;
}) => {
  if (!view.isJudge || view.stage !== 'judging')
    return (
      <HackathonJudgingNotice view={view} locale={locale} timeZone={timeZone} />
    );
  return (
    <>
      <p className="mt-3 text-body-sm text-neutral">
        {hackathon_judging_open(
          { date: scheduleMoment(view.judgingEndsAt, locale, timeZone) },
          { locale },
        )}
      </p>
      <HackathonJudgeEntries
        eventId={view.event.id}
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
        <>
          <Judging view={view} locale={locale} timeZone={timeZone} />
          <HackathonCertificates
            certificates={view.certificates}
            locale={locale}
          />
          {view.recordOffer ? (
            <HackathonRecordOffer
              eventId={eventId}
              isShown={view.recordOffer.isShown}
              locale={locale}
            />
          ) : null}
        </>
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
