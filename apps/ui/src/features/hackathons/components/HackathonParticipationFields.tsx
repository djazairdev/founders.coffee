import {
  hackathon_details_capacity,
  hackathon_details_capacity_hint,
  hackathon_details_conditions_heading,
  hackathon_details_minimum_age,
  hackathon_details_minimum_age_hint,
  hackathon_details_rules,
  hackathon_details_rules_heading,
  hackathon_details_rules_hint,
  hackathon_details_team_hint,
  hackathon_details_team_max,
  hackathon_details_team_min,
  hackathon_details_teams_heading,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { fieldNoteId, FormField, Input } from '@founders-coffee/ui';

import type { DetailsField } from '../hackathon-details-form';
import {
  detailsFieldId,
  type DetailsFormState,
} from '../useHackathonDetailsForm';

type Form = DetailsFormState;

const NumberField = ({
  form,
  field,
  label,
  hint,
  isOptional = false,
  locale,
}: {
  form: Form;
  field: Extract<
    DetailsField,
    'teamMin' | 'teamMax' | 'capacity' | 'minimumAge'
  >;
  label: string;
  hint?: string;
  isOptional?: boolean;
  locale: Locale;
}) => {
  const id = detailsFieldId(field);
  const error = form.errors[field];
  return (
    <FormField
      id={id}
      label={label}
      isOptional={isOptional}
      optionalLabel={optional({}, { locale })}
      hint={hint}
      error={error}
    >
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        value={form.values[field]}
        disabled={form.isLocked(field)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? fieldNoteId(id) : undefined}
        onChange={(event) => form.set(field, event.target.value)}
      />
    </FormField>
  );
};

export const HackathonParticipationFields = ({
  form,
  locale,
}: {
  form: Form;
  locale: Locale;
}) => {
  const rulesId = detailsFieldId('rules');
  const rulesHint = hackathon_details_rules_hint({}, { locale });
  const teamMax = Number(form.values.teamMax);
  const teamHint =
    Number.isInteger(teamMax) && teamMax >= 1
      ? hackathon_details_team_hint({ max: teamMax }, { locale })
      : null;

  return (
    <div className="grid gap-4">
      <section className="grid gap-3">
        <h3 className="font-display text-h5">
          {hackathon_details_teams_heading({}, { locale })}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            form={form}
            field="teamMin"
            label={hackathon_details_team_min({}, { locale })}
            locale={locale}
          />
          <NumberField
            form={form}
            field="teamMax"
            label={hackathon_details_team_max({}, { locale })}
            locale={locale}
          />
        </div>
        {teamHint ? (
          <p className="text-body-sm text-neutral">{teamHint}</p>
        ) : null}
      </section>
      <section className="grid gap-3">
        <h3 className="font-display text-h5">
          {hackathon_details_conditions_heading({}, { locale })}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            form={form}
            field="capacity"
            label={hackathon_details_capacity({}, { locale })}
            hint={hackathon_details_capacity_hint({}, { locale })}
            isOptional
            locale={locale}
          />
          <NumberField
            form={form}
            field="minimumAge"
            label={hackathon_details_minimum_age({}, { locale })}
            hint={hackathon_details_minimum_age_hint({}, { locale })}
            isOptional
            locale={locale}
          />
        </div>
      </section>
      <section className="grid gap-3">
        <h3 className="font-display text-h5">
          {hackathon_details_rules_heading({}, { locale })}
        </h3>
        <FormField
          id={rulesId}
          label={hackathon_details_rules({}, { locale })}
          isOptional
          optionalLabel={optional({}, { locale })}
          hint={rulesHint}
          error={form.errors.rules}
        >
          <textarea
            id={rulesId}
            className="textarea textarea-sm md:textarea-md w-full"
            rows={6}
            dir="auto"
            value={form.values.rules}
            disabled={form.isLocked('rules')}
            aria-invalid={form.errors.rules ? true : undefined}
            aria-describedby={
              form.errors.rules || rulesHint ? fieldNoteId(rulesId) : undefined
            }
            onChange={(event) => form.set('rules', event.target.value)}
          />
        </FormField>
      </section>
    </div>
  );
};
