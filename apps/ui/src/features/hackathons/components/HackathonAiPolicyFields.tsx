import { HACKATHON_AI_POLICIES } from '@founders-coffee/core';
import {
  hackathon_details_ai,
  hackathon_details_ai_note,
  hackathon_details_ai_policy,
  type Locale,
} from '@founders-coffee/i18n';
import { fieldNoteId } from '@founders-coffee/ui';

import { AI_POLICY_LABELS } from '../detail-labels';
import {
  detailsFieldId,
  type useHackathonDetailsForm,
} from '../useHackathonDetailsForm';
import { HackathonNoteField } from './HackathonNoteField';

type Form = ReturnType<typeof useHackathonDetailsForm>;

export const HackathonAiPolicyFields = ({
  form,
  locale,
}: {
  form: Form;
  locale: Locale;
}) => {
  const policyId = detailsFieldId('aiPolicy');
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 font-display text-h4">
        {hackathon_details_ai({}, { locale })}
      </legend>
      <div
        id={policyId}
        role="radiogroup"
        aria-labelledby={`${policyId}-label`}
        aria-describedby={
          form.errors.aiPolicy ? fieldNoteId(policyId) : undefined
        }
      >
        <p id={`${policyId}-label`} className="text-label">
          {hackathon_details_ai_policy({}, { locale })}
        </p>
        <div className="mt-1.5 grid gap-3">
          {HACKATHON_AI_POLICIES.map((policy) => (
            <label key={policy} className="flex items-start gap-3">
              <input
                type="radio"
                name={policyId}
                value={policy}
                className="radio radio-sm radio-primary mt-0.5"
                checked={form.values.aiPolicy === policy}
                disabled={form.isLocked('aiPolicy')}
                onChange={() => form.set('aiPolicy', policy)}
              />
              <span>
                <span className="block text-body-sm font-medium">
                  {AI_POLICY_LABELS[policy].name({}, { locale })}
                </span>
                <span className="block text-body-sm text-neutral">
                  {AI_POLICY_LABELS[policy].hint({}, { locale })}
                </span>
              </span>
            </label>
          ))}
        </div>
        {form.errors.aiPolicy ? (
          <p
            id={fieldNoteId(policyId)}
            className="mt-1.5 text-body-sm text-error"
          >
            {form.errors.aiPolicy}
          </p>
        ) : null}
      </div>
      <HackathonNoteField
        form={form}
        field="aiPolicyNote"
        label={hackathon_details_ai_note({}, { locale })}
        locale={locale}
      />
    </fieldset>
  );
};
