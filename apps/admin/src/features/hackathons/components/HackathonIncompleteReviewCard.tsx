import {
  admin_hkn_capacity,
  admin_hkn_complete_before_review,
  admin_hkn_creator_email,
  admin_hkn_deadline,
  admin_hkn_judging_ends,
  admin_hkn_incomplete,
  admin_hkn_market,
  admin_hkn_missing_sections,
  admin_hkn_no_capacity,
  admin_hkn_organisation,
  admin_hkn_registration,
  admin_hkn_runs,
  admin_hkn_saved_information,
  admin_hkn_section_basics,
  admin_hkn_section_deadlines,
  admin_hkn_section_settings,
  admin_hkn_team_size,
  admin_hkn_team_size_value,
  formatDate,
  formatNumber,
  org_hackathon_dates,
  type Locale,
} from '@founders-coffee/i18n';
import { Badge } from '@founders-coffee/ui';

import type { HackathonReviewIncompleteItem } from '../api';

const SECTION_LABELS = {
  basics: admin_hkn_section_basics,
  deadlines: admin_hkn_section_deadlines,
  settings: admin_hkn_section_settings,
} as const;

export const HackathonIncompleteReviewCard = ({
  item,
  locale,
}: {
  item: HackathonReviewIncompleteItem;
  locale: Locale;
}) => {
  const options = { locale };
  const momentOf = (timestamp: number) =>
    formatDate(new Date(timestamp), locale, {
      timeZone: item.timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  return (
    <li className="space-y-3 rounded-box border border-base-300 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-h4 font-medium">
          <bdi>{item.title}</bdi>
        </h2>
        <Badge variant="accent">{admin_hkn_incomplete({}, options)}</Badge>
      </div>
      {item.description.trim() ? (
        <p className="whitespace-pre-line text-body-sm">
          <bdi>{item.description}</bdi>
        </p>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
        <dt className="text-neutral">{admin_hkn_creator_email({}, options)}</dt>
        <dd>
          <a
            className="link link-hover"
            dir="ltr"
            href={`mailto:${item.creatorEmail}`}
          >
            {item.creatorEmail}
          </a>
        </dd>
        {item.organisation ? (
          <>
            <dt className="text-neutral">
              {admin_hkn_organisation({}, options)}
            </dt>
            <dd>
              <bdi>{item.organisation.name}</bdi>
            </dd>
          </>
        ) : null}
        <dt className="text-neutral">{admin_hkn_market({}, options)}</dt>
        <dd>
          <bdi>{item.marketCode}</bdi>
        </dd>
        {item.endsAt ? (
          <>
            <dt className="text-neutral">{admin_hkn_runs({}, options)}</dt>
            <dd>
              {org_hackathon_dates(
                {
                  start: momentOf(item.startsAt.getTime()),
                  end: momentOf(item.endsAt.getTime()),
                },
                options,
              )}
            </dd>
          </>
        ) : null}
      </dl>
      <section className="space-y-2">
        <h3 className="text-body-sm font-medium">
          {admin_hkn_missing_sections({}, options)}
        </h3>
        <ul className="list-inside list-disc text-body-sm">
          {item.missingSections.map((section) => (
            <li key={section}>{SECTION_LABELS[section]({}, options)}</li>
          ))}
        </ul>
        <p className="text-caption text-neutral">
          {admin_hkn_complete_before_review({}, options)}
        </p>
      </section>
      {item.savedDeadlines || item.savedSettings ? (
        <details className="collapse collapse-arrow border border-base-300">
          <summary className="collapse-title text-body-sm font-medium">
            {admin_hkn_saved_information({}, options)}
          </summary>
          <div className="collapse-content space-y-3 text-body-sm">
            {item.savedDeadlines ? (
              <section className="space-y-1">
                <h3 className="font-medium">
                  {admin_hkn_section_deadlines({}, options)}
                </h3>
                <p>
                  {admin_hkn_registration({}, options)}{' '}
                  {org_hackathon_dates(
                    {
                      start: momentOf(item.savedDeadlines.registrationOpensAt),
                      end: momentOf(item.savedDeadlines.registrationClosesAt),
                    },
                    options,
                  )}
                </p>
                <p>
                  {admin_hkn_deadline({}, options)}{' '}
                  {momentOf(item.savedDeadlines.submissionDeadlineAt)}
                </p>
                <p>
                  {admin_hkn_judging_ends({}, options)}{' '}
                  {momentOf(item.savedDeadlines.judgingEndsAt)}
                </p>
              </section>
            ) : null}
            {item.savedSettings ? (
              <section className="space-y-1">
                <h3 className="font-medium">
                  {admin_hkn_section_settings({}, options)}
                </h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt>{admin_hkn_team_size({}, options)}</dt>
                  <dd>
                    {admin_hkn_team_size_value(
                      {
                        min: formatNumber(item.savedSettings.teamMin, locale),
                        max: formatNumber(item.savedSettings.teamMax, locale),
                      },
                      options,
                    )}
                  </dd>
                  <dt>{admin_hkn_capacity({}, options)}</dt>
                  <dd>
                    {item.savedSettings.capacity === undefined
                      ? admin_hkn_no_capacity({}, options)
                      : formatNumber(item.savedSettings.capacity, locale)}
                  </dd>
                </dl>
                {item.savedSettings.rules ? (
                  <p className="whitespace-pre-line">
                    <bdi>{item.savedSettings.rules}</bdi>
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </details>
      ) : null}
    </li>
  );
};
