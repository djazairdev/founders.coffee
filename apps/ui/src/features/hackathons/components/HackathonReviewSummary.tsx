import type { ReactNode } from 'react';

import {
  formatNumber,
  hackathon_details_ai_policy,
  hackathon_details_attendance,
  hackathon_details_capacity,
  hackathon_details_heading,
  hackathon_details_judging_ends,
  hackathon_details_minimum_age,
  hackathon_details_participation,
  hackathon_details_registration_closes,
  hackathon_details_registration_opens,
  hackathon_details_submission_deadline,
  hackathon_prizes_heading,
  hackathon_review_missing,
  hackathon_review_no_limit,
  hackathon_review_no_minimum_age,
  hackathon_review_no_prizes,
  hackathon_review_prizes_confirmed,
  hackathon_review_summary_heading,
  hackathon_rubric_heading,
  hackathon_schedule_kickoff,
  hackathon_team_size,
  hackathon_tracks_heading,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonDraftView } from '../api';
import { AI_POLICY_LABELS, ATTENDANCE_LABELS } from '../detail-labels';
import { scheduleMoment } from '../schedule';

const HEADING_ID = 'hackathon-review-summary-heading';

const Missing = ({ target, locale }: { target: string; locale: Locale }) => (
  <a href={`#${target}`} className="link font-medium text-secondary">
    {hackathon_review_missing({}, { locale })}
  </a>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
    <dt className="text-caption text-neutral">{label}</dt>
    <dd className="min-w-0 text-body-sm">{children}</dd>
  </div>
);

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="grid gap-1">
    <h4 className="font-medium">{title}</h4>
    {children}
  </div>
);

const Details = ({
  draft,
  locale,
  timeZone,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  timeZone: string;
}) => {
  const { details } = draft;
  const options = { locale };
  if (!details)
    return <Missing target="hackathon-details-heading" locale={locale} />;
  const moment = (at: number) => scheduleMoment(at, locale, timeZone);
  return (
    <dl className="divide-y divide-base-300">
      <Row label={hackathon_details_registration_opens({}, options)}>
        {moment(details.registrationOpensAt)}
      </Row>
      <Row label={hackathon_details_registration_closes({}, options)}>
        {moment(details.registrationClosesAt)}
      </Row>
      <Row label={hackathon_schedule_kickoff({}, options)}>
        {moment(draft.event.startsAt)}
      </Row>
      <Row label={hackathon_details_submission_deadline({}, options)}>
        {moment(details.submissionDeadlineAt)}
      </Row>
      <Row label={hackathon_details_judging_ends({}, options)}>
        {moment(details.judgingEndsAt)}
      </Row>
      <Row label={hackathon_details_attendance({}, options)}>
        {details.attendanceModes
          .map((mode) => ATTENDANCE_LABELS[mode]({}, options))
          .join(' · ')}
      </Row>
      <Row label={hackathon_details_participation({}, options)}>
        {hackathon_team_size(
          {
            min: formatNumber(details.teamMin, locale),
            max: formatNumber(details.teamMax, locale),
          },
          options,
        )}
      </Row>
      <Row label={hackathon_details_capacity({}, options)}>
        {details.capacity === null
          ? hackathon_review_no_limit({}, options)
          : formatNumber(details.capacity, locale)}
      </Row>
      <Row label={hackathon_details_minimum_age({}, options)}>
        {details.minimumAge === null
          ? hackathon_review_no_minimum_age({}, options)
          : formatNumber(details.minimumAge, locale)}
      </Row>
      <Row label={hackathon_details_ai_policy({}, options)}>
        {AI_POLICY_LABELS[details.aiPolicy].name({}, options)}
      </Row>
    </dl>
  );
};

const Titles = ({ titles }: { titles: readonly string[] }) => (
  <ul className="grid gap-1 text-body-sm">
    {titles.map((title, index) => (
      <li key={`${index}-${title}`} className="min-w-0 break-words">
        <bdi>{title}</bdi>
      </li>
    ))}
  </ul>
);

const Rubric = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => (
  <>
    {draft.criteria.length > 0 ? (
      <ul className="grid gap-1 text-body-sm">
        {draft.criteria.map((criterion) => (
          <li key={criterion.id} className="flex justify-between gap-4">
            <bdi className="min-w-0 break-words">{criterion.name}</bdi>
            <span className="shrink-0 tabular-nums">
              {formatNumber(criterion.weight / 100, locale, {
                style: 'percent',
              })}
            </span>
          </li>
        ))}
      </ul>
    ) : null}
    {draft.review.gaps.includes('rubric') ? (
      <Missing target="hackathon-rubric-heading" locale={locale} />
    ) : null}
  </>
);

export const HackathonReviewSummary = ({
  draft,
  locale,
  timeZone,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  timeZone: string;
}) => {
  const options = { locale };
  const confirmed = draft.prizes.filter((prize) => prize.confirmation).length;
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="grid gap-5 rounded-box border border-base-300 p-4"
    >
      <h3 id={HEADING_ID} className="font-display text-body-lg">
        {hackathon_review_summary_heading({}, options)}
      </h3>
      <Group title={hackathon_details_heading({}, options)}>
        <Details draft={draft} locale={locale} timeZone={timeZone} />
      </Group>
      <Group title={hackathon_tracks_heading({}, options)}>
        {draft.tracks.length > 0 ? (
          <Titles titles={draft.tracks.map((track) => track.title)} />
        ) : (
          <Missing target="hackathon-tracks-heading" locale={locale} />
        )}
      </Group>
      <Group title={hackathon_prizes_heading({}, options)}>
        {draft.prizes.length > 0 ? (
          <>
            <Titles titles={draft.prizes.map((prize) => prize.title)} />
            <p className="text-caption text-neutral">
              {hackathon_review_prizes_confirmed(
                {
                  confirmed: formatNumber(confirmed, locale),
                  count: formatNumber(draft.prizes.length, locale),
                },
                options,
              )}
            </p>
          </>
        ) : (
          <p className="text-body-sm text-neutral">
            {hackathon_review_no_prizes({}, options)}
          </p>
        )}
      </Group>
      <Group title={hackathon_rubric_heading({}, options)}>
        <Rubric draft={draft} locale={locale} />
      </Group>
    </section>
  );
};
