import {
  formatDate,
  hackathon_manage_error,
  hackathon_manage_outcomes_group,
  hackathon_manage_prizes_group,
  hackathon_manage_loading,
  hackathon_manage_locked,
  hackathon_manage_not_found,
  hackathon_manage_title,
  hackathon_prizes_hint,
  org_hackathon_dates,
  org_hackathon_status_in_review,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  LoadingStatus,
  StatusMessage,
  useToast,
} from '@founders-coffee/ui';

import { OrganisationBreadcrumbs } from '../../../components/OrganisationBreadcrumbs';
import type { RootMarket } from '../../markets/api';
import { hackathonStatusLabel } from '../../organisations/hackathon-labels';
import { isHackathonMissing, isHackathonsDisabled } from '../errors';
import { isolateBidi, utcOffsetAt } from '../hackathon-timezone';
import { useHackathonDraft } from '../hooks';
import { HackathonDashboard } from './HackathonDashboard';
import { HackathonDetailsForm } from './HackathonDetailsForm';
import { HackathonJudgingProgress } from './HackathonJudgingProgress';
import { HackathonManageCollapse } from './HackathonManageCollapse';
import { HackathonManageFeedback } from './HackathonManageFeedback';
import { HackathonPrizeDelivery } from './HackathonPrizeDelivery';
import { HackathonPrizesSection } from './HackathonPrizesSection';
import { HackathonResultsPanel } from './HackathonResultsPanel';
import { HackathonReviewBanner } from './HackathonReviewBanner';
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
}: {
  eventId: string;
  locale: Locale;
  markets?: readonly RootMarket[];
}) => {
  const availableMarkets = markets ?? [];
  const query = useHackathonDraft(eventId);
  const feedback = useToast();
  const draft = query.data;
  const market = availableMarkets.find(
    (candidate) => candidate.code === draft?.event.marketCode,
  );
  const timeZone = market?.timezone ?? 'UTC';
  const timeZoneName =
    locale === 'ar'
      ? (market?.nameAr ?? market?.name ?? timeZone)
      : locale === 'fr'
        ? (market?.nameFr ?? market?.name ?? timeZone)
        : (market?.name ?? timeZone);

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
  const utcOffset = utcOffsetAt(timeZone, draft.event.startsAt);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <OrganisationBreadcrumbs
        locale={locale}
        organisationName={draft.organisation.name}
        organisationSlug={draft.organisation.slug}
      />
      <h1 className="mt-2 flex flex-wrap items-center gap-2 font-display text-h3">
        <bdi className="min-w-0 break-words">{draft.event.title}</bdi>
        <span className="badge badge-ghost">
          {draft.event.status === 'draft' &&
          (draft.review.status === 'submitted' ||
            (draft.review.status === 'draft' && draft.details !== null))
            ? org_hackathon_status_in_review({}, { locale })
            : hackathonStatusLabel(draft.event.status, locale)}
        </span>
      </h1>
      <p className="mt-1 text-body-sm text-neutral">
        {org_hackathon_dates(
          { start: isolateBidi(kickoff), end: isolateBidi(demoDay) },
          { locale },
        )}
      </p>
      <HackathonReviewBanner draft={draft} locale={locale} />
      <HackathonDashboard draft={draft} locale={locale} />
      {draft.event.status === 'published' ? (
        <HackathonManageCollapse
          title={hackathon_manage_outcomes_group({}, { locale })}
        >
          <HackathonJudgingProgress eventId={draft.event.id} locale={locale} />
          <HackathonResultsPanel
            eventId={draft.event.id}
            locale={locale}
            timeZone={timeZone}
          />
          <HackathonPrizeDelivery
            eventId={draft.event.id}
            locale={locale}
            onFeedback={feedback.show}
          />
        </HackathonManageCollapse>
      ) : null}
      {draft.isEditable ? (
        <>
          <HackathonDetailsForm
            draft={draft}
            locale={locale}
            timeZone={timeZone}
            timeZoneName={timeZoneName}
            utcOffset={utcOffset}
            onFeedback={feedback.show}
          />
          <HackathonManageCollapse
            title={hackathon_manage_prizes_group({}, { locale })}
            description={hackathon_prizes_hint({}, { locale })}
          >
            <HackathonPrizesSection
              draft={draft}
              locale={locale}
              timeZone={timeZone}
              onFeedback={feedback.show}
            />
          </HackathonManageCollapse>
        </>
      ) : draft.review.status !== 'submitted' ? (
        <StatusMessage variant="info" className="mt-6">
          {hackathon_manage_locked({}, { locale })}
        </StatusMessage>
      ) : null}
      <HackathonManageFeedback
        locale={locale}
        notification={feedback.notification}
        onDismiss={feedback.clear}
      />
    </div>
  );
};
