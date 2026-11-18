import { HACKATHON_SCORE_COMMENT_MAX } from '@founders-coffee/core';
import {
  formatNumber,
  hackathon_judging_comment,
  hackathon_judging_scale,
  hackathon_judging_score_needed,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { FormField } from '@founders-coffee/ui';

import type { JudgeCriterionView } from '../api';
import { scoreOptionId, type ScoreDraft } from '../judging-form';

export const HackathonJudgeCriterionField = ({
  criterion,
  draft,
  isMissing,
  isDisabled,
  locale,
  onChange,
}: {
  criterion: JudgeCriterionView;
  draft: ScoreDraft;
  isMissing: boolean;
  isDisabled: boolean;
  locale: Locale;
  onChange: (draft: ScoreDraft) => void;
}) => {
  const options = { locale };
  const number = (value: number) => formatNumber(value, locale);
  const aboutId = `judge-criterion-${criterion.id}-about`;
  const missingId = `judge-criterion-${criterion.id}-missing`;
  const commentId = `judge-criterion-${criterion.id}-comment`;
  const values = Array.from(
    { length: criterion.scale },
    (_, index) => index + 1,
  );
  return (
    <fieldset
      className="grid gap-3 rounded-box border border-base-300 p-3"
      aria-describedby={isMissing ? `${aboutId} ${missingId}` : aboutId}
    >
      <legend className="px-1 font-medium">
        <bdi className="break-words">{criterion.name}</bdi>
      </legend>
      <div id={aboutId} className="grid gap-1 text-body-sm text-neutral">
        <p className="break-words whitespace-pre-line">
          <bdi>{criterion.description}</bdi>
        </p>
        <p>
          {hackathon_judging_scale(
            {
              min: number(1),
              max: number(criterion.scale),
              weight: number(criterion.weight),
            },
            options,
          )}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {values.map((value) => (
          <label
            key={value}
            className={`btn btn-xs sm:btn-sm md:btn-md w-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 ${draft.value === value ? 'btn-primary' : 'btn-outline'} ${isDisabled ? 'btn-disabled' : ''}`}
          >
            <input
              id={scoreOptionId(criterion.id, value)}
              type="radio"
              name={`judge-score-${criterion.id}`}
              className="sr-only"
              checked={draft.value === value}
              aria-disabled={isDisabled}
              onChange={() => {
                if (!isDisabled) onChange({ ...draft, value });
              }}
            />
            {number(value)}
          </label>
        ))}
      </div>
      {isMissing ? (
        <p id={missingId} className="text-body-sm text-error">
          {hackathon_judging_score_needed({}, options)}
        </p>
      ) : null}
      <FormField
        id={commentId}
        label={hackathon_judging_comment({}, options)}
        isOptional
        optionalLabel={optional({}, options)}
      >
        <textarea
          id={commentId}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={2}
          dir="auto"
          maxLength={HACKATHON_SCORE_COMMENT_MAX}
          value={draft.comment}
          readOnly={isDisabled}
          onChange={(event) =>
            onChange({ ...draft, comment: event.target.value })
          }
        />
      </FormField>
    </fieldset>
  );
};
