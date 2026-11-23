import {
  hackathon_application_questions_label,
  hackathon_application_questions_move_down,
  hackathon_application_questions_move_up,
  hackathon_application_questions_optional,
  hackathon_application_questions_options,
  hackathon_application_questions_options_hint,
  hackathon_application_questions_remove,
  hackathon_application_questions_required,
  hackathon_application_questions_scope,
  hackathon_application_questions_scope_participant,
  hackathon_application_questions_scope_team,
  hackathon_application_questions_type,
  hackathon_application_questions_type_long,
  hackathon_application_questions_type_multiple,
  hackathon_application_questions_type_short,
  hackathon_application_questions_type_single,
  hackathon_application_questions_type_url,
  formatNumber,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, Input } from '@founders-coffee/ui';

import type { HackathonApplicationQuestion } from '../application-answers';

const TYPES = [
  ['short_text', hackathon_application_questions_type_short],
  ['long_text', hackathon_application_questions_type_long],
  ['single_choice', hackathon_application_questions_type_single],
  ['multiple_choice', hackathon_application_questions_type_multiple],
  ['url', hackathon_application_questions_type_url],
] as const;

export const HackathonApplicationQuestionEditor = ({
  question,
  index,
  count,
  canEdit,
  isBusy,
  locale,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  question: HackathonApplicationQuestion;
  index: number;
  count: number;
  canEdit: boolean;
  isBusy: boolean;
  locale: Locale;
  onChange: (question: HackathonApplicationQuestion) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) => {
  const options = { locale };
  const isChoice =
    question.type === 'single_choice' || question.type === 'multiple_choice';
  const disabled = !canEdit || isBusy;
  return (
    <fieldset className="grid gap-4 rounded-box bg-base-200 p-4">
      <legend className="font-medium">
        {hackathon_application_questions_label({}, options)}{' '}
        {formatNumber(index + 1, locale)}
      </legend>
      <label className="grid gap-2">
        <span className="text-label">
          {hackathon_application_questions_label({}, options)}
        </span>
        <Input
          dir="auto"
          maxLength={160}
          value={question.label}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...question, label: event.target.value })
          }
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-label">
            {hackathon_application_questions_type({}, options)}
          </span>
          <select
            className="select select-sm md:select-md w-full"
            value={question.type}
            disabled={disabled}
            onChange={(event) => {
              const type = event.target
                .value as HackathonApplicationQuestion['type'];
              const hasChoices =
                type === 'single_choice' || type === 'multiple_choice';
              onChange({
                ...question,
                type,
                options: hasChoices
                  ? question.options.length > 1
                    ? question.options
                    : ['', '']
                  : [],
              });
            }}
          >
            {TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label({}, options)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-label">
            {hackathon_application_questions_scope({}, options)}
          </span>
          <select
            className="select select-sm md:select-md w-full"
            value={question.scope}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...question,
                scope: event.target
                  .value as HackathonApplicationQuestion['scope'],
              })
            }
          >
            <option value="participant">
              {hackathon_application_questions_scope_participant({}, options)}
            </option>
            <option value="team">
              {hackathon_application_questions_scope_team({}, options)}
            </option>
          </select>
        </label>
      </div>
      {isChoice ? (
        <label className="grid gap-2">
          <span className="text-label">
            {hackathon_application_questions_options({}, options)}
          </span>
          <textarea
            className="textarea textarea-sm md:textarea-md w-full"
            rows={3}
            dir="auto"
            value={question.options.join('\n')}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...question,
                options: event.target.value
                  .split('\n')
                  .map((option) => option.trim())
                  .filter(Boolean),
              })
            }
            aria-describedby={`application-options-hint-${question.id}`}
          />
          <span
            id={`application-options-hint-${question.id}`}
            className="text-body-xs text-neutral"
          >
            {hackathon_application_questions_options_hint({}, options)}
          </span>
        </label>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={question.isRequired}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...question, isRequired: event.target.checked })
            }
          />
          <span className="text-body-sm">
            {question.isRequired
              ? hackathon_application_questions_required({}, options)
              : hackathon_application_questions_optional({}, options)}
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label={hackathon_application_questions_move_up({}, options)}
            disabled={disabled || index === 0}
            onClick={onMoveUp}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label={hackathon_application_questions_move_down({}, options)}
            disabled={disabled || index === count - 1}
            onClick={onMoveDown}
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onRemove}
          >
            {hackathon_application_questions_remove({}, options)}
          </Button>
        </div>
      </div>
    </fieldset>
  );
};
