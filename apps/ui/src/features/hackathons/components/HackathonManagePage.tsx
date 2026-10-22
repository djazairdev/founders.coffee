import { Link } from '@tanstack/react-router';

import {
  formatDate,
  hackathon_details_heading,
  hackathon_details_sub,
  hackathon_manage_created,
  hackathon_manage_error,
  hackathon_manage_loading,
  hackathon_manage_locked,
  hackathon_manage_not_found,
  hackathon_manage_title,
  org_hackathon_dates,
  org_hackathon_status_in_review,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import { localizedMyOrganisation } from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import { hackathonStatusLabel } from '../../organisations/hackathon-labels';
import { isHackathonMissing, isHackathonsDisabled } from '../errors';
import { useHackathonDraft } from '../hooks';
import { HackathonDashboard } from './HackathonDashboard';
import { HackathonDetailsForm } from './HackathonDetailsForm';
import { HackathonPrizesSection } from './HackathonPrizesSection';
import { HackathonReviewBanner } from './HackathonReviewBanner';
import { HackathonReviewSection } from './HackathonReviewSection';
import { HackathonRubricSection } from './HackathonRubricSection';
import { HackathonTracksSection } from './HackathonTracksSection';
import { HackathonsUnavailable } from './HackathonsUnavailable';

const momentOf = (epochMs: number, locale: Locale, timeZone: string) =>
  formatDate(new Date(epochMs), locale, {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

export const HackathonManagePage = ({
  eventId,
  locale,
  markets,
  isJustCreated,
}: {
  eventId: string;
  locale: Locale;
  markets: readonly RootMarket[];
  isJustCreated: boolean;
}) => {
  const query = useHackathonDraft(eventId);
  const draft = query.data;
  const timeZone =
    markets.find((market) => market.code === draft?.event.marketCode)
      ?.timezone ?? 'UTC';

  if (!draft)
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <h1 className="font-display text-h3">
          {hackathon_manage_title({}, { locale })}
        </h1>
        {query.isError ? (
          isHackathonsDisabled(query.error) ? (
            <div className="mt-6">
              <HackathonsUnavailable locale={locale} />
            </div>
          ) : isHackathonMissing(query.error) ? (
            <StatusMessage variant="warning" className="mt-6">
              {hackathon_manage_not_found({}, { locale })}
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
              {hackathon_manage_error({}, { locale })}
            </StatusMessage>
          )
        ) : (
          <LoadingStatus
            className="mt-6"
            label={hackathon_manage_loading({}, { locale })}
          />
        )}
      </div>
    );

  const kickoff = momentOf(draft.event.startsAt, locale, timeZone);
  const demoDay = momentOf(draft.event.endsAt, locale, timeZone);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Link
        {...localizedMyOrganisation(locale, draft.organisation.slug)}
        className="link text-body-sm text-neutral"
      >
        <bdi>{draft.organisation.name}</bdi>
      </Link>
      <h1 className="mt-2 flex flex-wrap items-center gap-2 font-display text-h3">
        <bdi className="min-w-0 break-words">{draft.event.title}</bdi>
        <span className="badge badge-ghost">
          {draft.event.status === 'draft' && draft.review.status === 'submitted'
            ? org_hackathon_status_in_review({}, { locale })
            : hackathonStatusLabel(draft.event.status, locale)}
        </span>
      </h1>
      <p className="mt-1 text-body-sm text-neutral">
        {org_hackathon_dates({ start: kickoff, end: demoDay }, { locale })}
      </p>
      {isJustCreated ? (
        <StatusMessage variant="success" className="mt-6">
          {hackathon_manage_created({}, { locale })}
        </StatusMessage>
      ) : null}
      <HackathonReviewBanner draft={draft} locale={locale} />
      <HackathonDashboard
        draft={draft}
        locale={locale}
        timeZone={timeZone}
        markets={markets}
      />
      {draft.isEditable ? (
        <>
          <section aria-labelledby="hackathon-details-heading" className="mt-8">
            <h2 id="hackathon-details-heading" className="font-display text-h4">
              {hackathon_details_heading({}, { locale })}
            </h2>
            <p className="mt-1 mb-6 text-body-sm text-neutral">
              {hackathon_details_sub({}, { locale })}
            </p>
            <HackathonDetailsForm
              draft={draft}
              locale={locale}
              timeZone={timeZone}
              kickoff={kickoff}
              demoDay={demoDay}
            />
          </section>
          <HackathonTracksSection draft={draft} locale={locale} />
          <HackathonPrizesSection
            draft={draft}
            locale={locale}
            timeZone={timeZone}
          />
          <HackathonRubricSection draft={draft} locale={locale} />
          <HackathonReviewSection
            draft={draft}
            locale={locale}
            timeZone={timeZone}
          />
        </>
      ) : draft.review.status === 'submitted' ? (
        <HackathonReviewSection
          draft={draft}
          locale={locale}
          timeZone={timeZone}
        />
      ) : (
        <StatusMessage variant="info" className="mt-6">
          {hackathon_manage_locked({}, { locale })}
        </StatusMessage>
      )}
    </div>
  );
};
