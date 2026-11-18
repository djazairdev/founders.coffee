import {
  admin_hkn_criterion_weight,
  admin_hkn_rubric,
  admin_hkn_rubric_scale,
  formatNumber,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonReviewCriterion } from '../api';

export const HackathonPreviewRubric = ({
  locale,
  criteria,
}: {
  locale: Locale;
  criteria: readonly HackathonReviewCriterion[];
}) => {
  const options = { locale };
  const scale = criteria[0]?.scale;
  return (
    <section className="space-y-2">
      <h3 className="text-body font-medium">{admin_hkn_rubric({}, options)}</h3>
      {scale ? (
        <p className="text-body-sm text-neutral">
          {admin_hkn_rubric_scale(
            { max: formatNumber(scale, locale) },
            options,
          )}
        </p>
      ) : null}
      <ol className="space-y-3">
        {criteria.map((criterion) => (
          <li
            key={criterion.name}
            className="space-y-1 rounded-box bg-base-200 p-3 text-body-sm"
          >
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">
                <bdi>{criterion.name}</bdi>
              </span>
              <span className="text-caption text-neutral">
                {admin_hkn_criterion_weight(
                  { weight: formatNumber(criterion.weight, locale) },
                  options,
                )}
              </span>
            </p>
            <p className="whitespace-pre-line">
              <bdi>{criterion.description}</bdi>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
};
