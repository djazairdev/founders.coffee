import type { ReactNode } from 'react';

import {
  formatNumber,
  hackathon_details_ai_policy,
  hackathon_details_attendance,
  hackathon_details_heading,
  hackathon_details_licence,
  hackathon_details_minimum_age,
  hackathon_details_participation,
  hackathon_details_rules,
  hackathon_review_no_minimum_age,
  hackathon_team_size,
  type Locale,
} from '@founders-coffee/i18n';

import type { PublicHackathonRules } from '../api';
import { AI_POLICY_LABELS, ATTENDANCE_LABELS } from '../detail-labels';

const HEADING_ID = 'hackathon-rules-heading';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1 py-3">
    <dt className="eyebrow">{label}</dt>
    <dd className="min-w-0 text-body-sm">{children}</dd>
  </div>
);

const Authored = ({ text }: { text: string }) => (
  <p className="whitespace-pre-line break-words">
    <bdi>{text}</bdi>
  </p>
);

export const HackathonRules = ({
  rules,
  locale,
}: {
  rules: PublicHackathonRules;
  locale: Locale;
}) => {
  const options = { locale };
  const policy = AI_POLICY_LABELS[rules.aiPolicy];
  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4 font-semibold">
        {hackathon_details_heading({}, options)}
      </h2>
      <dl className="mt-2 divide-y divide-base-300">
        <Row label={hackathon_details_participation({}, options)}>
          {hackathon_team_size(
            {
              min: formatNumber(rules.teamMin, locale),
              max: formatNumber(rules.teamMax, locale),
            },
            options,
          )}
        </Row>
        <Row label={hackathon_details_attendance({}, options)}>
          {rules.attendanceModes
            .map((mode) => ATTENDANCE_LABELS[mode]({}, options))
            .join(' · ')}
        </Row>
        <Row label={hackathon_details_minimum_age({}, options)}>
          {rules.minimumAge === null
            ? hackathon_review_no_minimum_age({}, options)
            : formatNumber(rules.minimumAge, locale)}
        </Row>
        <Row label={hackathon_details_ai_policy({}, options)}>
          <p className="font-medium">{policy.name({}, options)}</p>
          <p className="text-neutral">{policy.hint({}, options)}</p>
          {rules.aiPolicyNote ? <Authored text={rules.aiPolicyNote} /> : null}
        </Row>
        {rules.rules ? (
          <Row label={hackathon_details_rules({}, options)}>
            <Authored text={rules.rules} />
          </Row>
        ) : null}
        {rules.licenceNote ? (
          <Row label={hackathon_details_licence({}, options)}>
            <Authored text={rules.licenceNote} />
          </Row>
        ) : null}
      </dl>
    </section>
  );
};
