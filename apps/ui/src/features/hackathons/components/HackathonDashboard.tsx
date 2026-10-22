import { Link } from '@tanstack/react-router';

import {
  formatNumber,
  hackathon_dashboard_capacity,
  hackathon_dashboard_edit,
  hackathon_dashboard_error,
  hackathon_dashboard_go_review,
  hackathon_dashboard_heading,
  hackathon_dashboard_judges,
  hackathon_dashboard_loading,
  hackathon_dashboard_public_page,
  hackathon_dashboard_registered,
  hackathon_dashboard_review,
  hackathon_dashboard_reviews,
  hackathon_dashboard_reviews_count,
  hackathon_dashboard_submissions,
  hackathon_dashboard_teams,
  hackathon_dashboard_waitlisted,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import { localizedEvent } from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import type {
  HackathonDashboard as Dashboard,
  HackathonDraftView,
} from '../api';
import { reviewStatusLabel } from '../dashboard-labels';
import { useHackathonDashboard } from '../hooks';
import { phaseSentence } from '../schedule';

const HEADING_ID = 'hackathon-dashboard-heading';
const LINK_CLASS = 'link link-hover font-medium text-secondary';

const Stat = ({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) => (
  <div className="rounded-box bg-base-200 p-3">
    <dt className="text-caption text-neutral">{label}</dt>
    <dd className="mt-1 font-display text-h4">{value}</dd>
    {note ? <dd className="text-caption text-neutral">{note}</dd> : null}
  </div>
);

const Counts = ({
  dashboard,
  locale,
}: {
  dashboard: Dashboard;
  locale: Locale;
}) => {
  const { counts, capacity } = dashboard;
  const options = { locale };
  const number = (value: number) => formatNumber(value, locale);
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat
        label={hackathon_dashboard_registered({}, options)}
        value={number(counts.registered)}
        note={
          capacity === null
            ? undefined
            : hackathon_dashboard_capacity(
                { capacity: number(capacity) },
                options,
              )
        }
      />
      <Stat
        label={hackathon_dashboard_waitlisted({}, options)}
        value={number(counts.waitlisted)}
      />
      <Stat
        label={hackathon_dashboard_teams({}, options)}
        value={number(counts.teams)}
      />
      <Stat
        label={hackathon_dashboard_submissions({}, options)}
        value={number(counts.submissions)}
      />
      <Stat
        label={hackathon_dashboard_judges({}, options)}
        value={number(counts.judges)}
      />
      <Stat
        label={hackathon_dashboard_reviews({}, options)}
        value={hackathon_dashboard_reviews_count(
          {
            done: number(counts.reviewsDone),
            expected: number(counts.reviewsExpected),
          },
          options,
        )}
      />
    </dl>
  );
};

export const HackathonDashboard = ({
  draft,
  locale,
  timeZone,
  markets,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  timeZone: string;
  markets: readonly RootMarket[];
}) => {
  const query = useHackathonDashboard(draft.event.id, draft.details !== null);
  const dashboard = query.data;
  if (draft.details === null) return null;
  const marketSlug = markets.find(
    (market) => market.code === draft.event.marketCode,
  )?.slug;
  const hasReviewSection =
    draft.event.status === 'draft' &&
    draft.review.status !== 'approved' &&
    (draft.isEditable || draft.review.status === 'submitted');

  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_dashboard_heading({}, { locale })}
      </h2>
      {dashboard ? (
        <>
          {dashboard.status === 'cancelled' ? null : (
            <p className="mt-1 text-body-sm text-neutral">
              {phaseSentence(dashboard.schedule, locale, timeZone)}
            </p>
          )}
          <Counts dashboard={dashboard} locale={locale} />
        </>
      ) : query.isError ? (
        <StatusMessage
          variant="error"
          className="mt-4"
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              {retry({}, { locale })}
            </Button>
          }
        >
          {hackathon_dashboard_error({}, { locale })}
        </StatusMessage>
      ) : (
        <LoadingStatus
          className="mt-4"
          label={hackathon_dashboard_loading({}, { locale })}
        />
      )}
      <p className="mt-4 text-body-sm">
        {hackathon_dashboard_review(
          { status: reviewStatusLabel(draft.review.status, locale) },
          { locale },
        )}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-body-sm">
        {draft.event.status === 'published' && dashboard && marketSlug ? (
          <li>
            <Link
              {...localizedEvent(locale, marketSlug, dashboard.slug)}
              className={LINK_CLASS}
            >
              {hackathon_dashboard_public_page({}, { locale })}
            </Link>
          </li>
        ) : null}
        {draft.isEditable ? (
          <li>
            <a href="#hackathon-details-heading" className={LINK_CLASS}>
              {hackathon_dashboard_edit({}, { locale })}
            </a>
          </li>
        ) : null}
        {hasReviewSection ? (
          <li>
            <a href="#hackathon-review-heading" className={LINK_CLASS}>
              {hackathon_dashboard_go_review({}, { locale })}
            </a>
          </li>
        ) : null}
      </ul>
    </section>
  );
};
