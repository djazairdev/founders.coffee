import {
  formatNumber,
  hackathon_dashboard_capacity,
  hackathon_dashboard_error,
  hackathon_dashboard_heading,
  hackathon_dashboard_judges,
  hackathon_dashboard_loading,
  hackathon_dashboard_registered,
  hackathon_dashboard_reviews,
  hackathon_dashboard_reviews_count,
  hackathon_dashboard_submissions,
  hackathon_dashboard_teams,
  hackathon_dashboard_waitlisted,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import type {
  HackathonDashboard as Dashboard,
  HackathonDraftView,
} from '../api';
import { useHackathonDashboard } from '../hooks';

const HEADING_ID = 'hackathon-dashboard-heading';

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
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => {
  const query = useHackathonDashboard(draft.event.id);
  const dashboard = query.data;

  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_dashboard_heading({}, { locale })}
      </h2>
      {dashboard ? (
        <Counts dashboard={dashboard} locale={locale} />
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
    </section>
  );
};
