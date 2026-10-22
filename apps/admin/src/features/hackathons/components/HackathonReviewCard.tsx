import {
  admin_hkn_capacity,
  admin_hkn_deadline,
  admin_hkn_judging_ends,
  admin_hkn_market,
  admin_hkn_minimum_age,
  admin_hkn_no_capacity,
  admin_hkn_no_minimum_age,
  admin_hkn_organisation,
  admin_hkn_registration,
  admin_hkn_rules,
  admin_hkn_runs,
  admin_hkn_submitted_on,
  admin_hkn_team_size,
  admin_hkn_team_size_value,
  admin_hkn_tracks,
  formatDate,
  org_hackathon_dates,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonReviewItem } from '../api';
import type { HackathonDecision } from '../decisions';
import { HackathonDecisionForm } from './HackathonDecisionForm';

export const HackathonReviewCard = ({
  locale,
  item,
  isDeciding,
  onDecide,
}: {
  locale: Locale;
  item: HackathonReviewItem;
  isDeciding: boolean;
  onDecide: (decision: HackathonDecision, note: string) => void;
}) => {
  const options = { locale };
  const momentOf = (date: Date) =>
    formatDate(new Date(date), locale, {
      timeZone: item.timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  const range = (start: Date, end: Date) =>
    org_hackathon_dates(
      { start: momentOf(start), end: momentOf(end) },
      options,
    );
  return (
    <li className="space-y-3 rounded-box border border-base-300 p-5">
      <h2 className="text-h4 font-medium">
        <bdi>{item.title}</bdi>
      </h2>
      <p className="whitespace-pre-line text-body-sm">
        <bdi>{item.description}</bdi>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
        <dt className="text-neutral">{admin_hkn_organisation({}, options)}</dt>
        <dd>
          <bdi>{item.organisation.name}</bdi>
        </dd>
        <dt className="text-neutral">{admin_hkn_market({}, options)}</dt>
        <dd>
          <bdi>{item.marketCode}</bdi>
        </dd>
        <dt className="text-neutral">{admin_hkn_runs({}, options)}</dt>
        <dd>{range(item.startsAt, item.endsAt ?? item.startsAt)}</dd>
        <dt className="text-neutral">{admin_hkn_registration({}, options)}</dt>
        <dd>{range(item.registrationOpensAt, item.registrationClosesAt)}</dd>
        <dt className="text-neutral">{admin_hkn_deadline({}, options)}</dt>
        <dd>{momentOf(item.submissionDeadlineAt)}</dd>
        <dt className="text-neutral">{admin_hkn_judging_ends({}, options)}</dt>
        <dd>{momentOf(item.judgingEndsAt)}</dd>
        <dt className="text-neutral">{admin_hkn_capacity({}, options)}</dt>
        <dd>
          {item.capacity === null
            ? admin_hkn_no_capacity({}, options)
            : item.capacity}
        </dd>
        <dt className="text-neutral">{admin_hkn_team_size({}, options)}</dt>
        <dd>
          {admin_hkn_team_size_value(
            { min: item.teamMin, max: item.teamMax },
            options,
          )}
        </dd>
        <dt className="text-neutral">{admin_hkn_minimum_age({}, options)}</dt>
        <dd>
          {item.minimumAge === null
            ? admin_hkn_no_minimum_age({}, options)
            : item.minimumAge}
        </dd>
        <dt className="text-neutral">{admin_hkn_tracks({}, options)}</dt>
        <dd>
          <ul className="list-inside list-disc">
            {item.trackTitles.map((title) => (
              <li key={title}>
                <bdi>{title}</bdi>
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      {item.rules ? (
        <div className="rounded-box bg-base-200 p-3 text-body-sm">
          <p className="text-caption text-neutral">
            {admin_hkn_rules({}, options)}
          </p>
          <p className="whitespace-pre-line">
            <bdi>{item.rules}</bdi>
          </p>
        </div>
      ) : null}
      <p className="text-caption text-neutral">
        {admin_hkn_submitted_on({ date: momentOf(item.submittedAt) }, options)}
      </p>
      <HackathonDecisionForm
        eventId={item.eventId}
        isDeciding={isDeciding}
        locale={locale}
        onDecide={onDecide}
      />
    </li>
  );
};
