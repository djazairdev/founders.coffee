import { ATTENDANCE_MODES, type AttendanceMode } from '@founders-coffee/core';
import {
  hackathon_details_attendance,
  hackathon_details_capacity,
  hackathon_details_capacity_hint,
  hackathon_details_minimum_age,
  hackathon_details_participation,
  hackathon_details_rules,
  hackathon_details_rules_ph,
  hackathon_details_team_hint,
  hackathon_details_team_max,
  hackathon_details_team_min,
  host_format_in_person,
  host_format_online,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { fieldNoteId, FormField, Input } from '@founders-coffee/ui';

import { TEAM_SIZE_MAX, type DetailsField } from '../hackathon-details-form';
import {
  detailsFieldId,
  type useHackathonDetailsForm,
} from '../useHackathonDetailsForm';

type Form = ReturnType<typeof useHackathonDetailsForm>;

const MODE_LABELS = {
  in_person: host_format_in_person,
  online: host_format_online,
} as const;

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
  offeredModes,
}: {
  form: Form;
  locale: Locale;
  offeredModes: readonly AttendanceMode[];
}) => {
  const modesId = detailsFieldId('attendanceModes');
  const rulesId = detailsFieldId('rules');
  const toggleMode = (mode: AttendanceMode, isChosen: boolean) =>
    form.set(
      'attendanceModes',
      ATTENDANCE_MODES.filter((candidate) =>
        candidate === mode
          ? isChosen
          : form.values.attendanceModes.includes(candidate),
      ),
    );

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 font-display text-h4">
        {hackathon_details_participation({}, { locale })}
      </legend>
      <div
        id={modesId}
        role="group"
        aria-labelledby={`${modesId}-label`}
        aria-describedby={
          form.errors.attendanceModes ? fieldNoteId(modesId) : undefined
        }
      >
        <p id={`${modesId}-label`} className="text-label">
          {hackathon_details_attendance({}, { locale })}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-4">
          {offeredModes.map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={form.values.attendanceModes.includes(mode)}
                onChange={(event) => toggleMode(mode, event.target.checked)}
              />
              {MODE_LABELS[mode]({}, { locale })}
            </label>
          ))}
        </div>
        {form.errors.attendanceModes ? (
          <p
            id={fieldNoteId(modesId)}
            className="mt-1.5 text-body-sm text-error"
          >
            {form.errors.attendanceModes}
          </p>
        ) : null}
      </div>
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
      <p className="-mt-2 text-body-sm text-neutral">
        {hackathon_details_team_hint({ max: TEAM_SIZE_MAX }, { locale })}
      </p>
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
          isOptional
          locale={locale}
        />
      </div>
      <FormField
        id={rulesId}
        label={hackathon_details_rules({}, { locale })}
        isOptional
        optionalLabel={optional({}, { locale })}
        error={form.errors.rules}
      >
        <textarea
          id={rulesId}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={6}
          dir="auto"
          placeholder={hackathon_details_rules_ph({}, { locale })}
          value={form.values.rules}
          aria-invalid={form.errors.rules ? true : undefined}
          aria-describedby={
            form.errors.rules ? fieldNoteId(rulesId) : undefined
          }
          onChange={(event) => form.set('rules', event.target.value)}
        />
      </FormField>
    </fieldset>
  );
};
