import type { HackathonAiPolicy } from '@founders-coffee/core';
import {
  hackathon_submission_ai_heading,
  hackathon_submission_ai_hint_ai_native,
  hackathon_submission_ai_hint_disclosed,
  hackathon_submission_ai_hint_restricted,
  hackathon_submission_ai_statement,
  hackathon_submission_ai_statement_hint,
  hackathon_submission_ai_tools,
  hackathon_submission_ai_tools_hint,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { FormField } from '@founders-coffee/ui';

import { noted } from '../submission-field-notes';
import {
  SUBMISSION_AI_STATEMENT_MAX,
  SUBMISSION_AI_TOOL_MAX,
  SUBMISSION_FIELD_IDS,
  type SubmissionFormDraft,
} from '../submission-form';
import type { SubmissionFormErrors } from '../submission-ready';

const HEADING_ID = 'hackathon-submission-ai-heading';

const POLICY_HINTS = {
  disclosed: hackathon_submission_ai_hint_disclosed,
  ai_native: hackathon_submission_ai_hint_ai_native,
  restricted: hackathon_submission_ai_hint_restricted,
} as const satisfies Record<HackathonAiPolicy, unknown>;

export const HackathonSubmissionAiFields = ({
  form,
  aiPolicy,
  errors,
  isReadOnly,
  locale,
  onChange,
}: {
  form: SubmissionFormDraft;
  aiPolicy: HackathonAiPolicy;
  errors: SubmissionFormErrors;
  isReadOnly: boolean;
  locale: Locale;
  onChange: (patch: Partial<SubmissionFormDraft>) => void;
}) => {
  const options = { locale };
  const optionalLabel = optional({}, options);
  const ids = SUBMISSION_FIELD_IDS;
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="grid gap-4 rounded-box border border-base-300 p-4"
    >
      <div className="grid gap-1">
        <h2 id={HEADING_ID} className="font-display text-body-lg font-semibold">
          {hackathon_submission_ai_heading({}, options)}
        </h2>
        <p className="text-body-sm text-neutral">
          {POLICY_HINTS[aiPolicy]({}, options)}
        </p>
      </div>
      <FormField
        id={ids.aiTools}
        label={hackathon_submission_ai_tools({}, options)}
        optionalLabel={optionalLabel}
        isOptional={aiPolicy !== 'ai_native'}
        hint={hackathon_submission_ai_tools_hint(
          { max: SUBMISSION_AI_TOOL_MAX },
          options,
        )}
        error={errors.aiTools}
      >
        <textarea
          id={ids.aiTools}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={3}
          dir="auto"
          value={form.aiTools}
          readOnly={isReadOnly}
          {...noted(ids.aiTools, errors.aiTools, true)}
          onChange={(event) => onChange({ aiTools: event.target.value })}
        />
      </FormField>
      <FormField
        id={ids.aiStatement}
        label={hackathon_submission_ai_statement({}, options)}
        optionalLabel={optionalLabel}
        hint={hackathon_submission_ai_statement_hint({}, options)}
        error={errors.aiStatement}
      >
        <textarea
          id={ids.aiStatement}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={4}
          dir="auto"
          maxLength={SUBMISSION_AI_STATEMENT_MAX}
          value={form.aiStatement}
          readOnly={isReadOnly}
          {...noted(ids.aiStatement, errors.aiStatement, true)}
          onChange={(event) => onChange({ aiStatement: event.target.value })}
        />
      </FormField>
    </section>
  );
};
