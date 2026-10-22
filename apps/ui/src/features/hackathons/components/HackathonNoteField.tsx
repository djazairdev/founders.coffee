import { optional, type Locale } from '@founders-coffee/i18n';
import { fieldNoteId, FormField } from '@founders-coffee/ui';

import type { DetailsField } from '../hackathon-details-form';
import {
  detailsFieldId,
  type useHackathonDetailsForm,
} from '../useHackathonDetailsForm';

export const HackathonNoteField = ({
  form,
  field,
  label,
  placeholder,
  locale,
}: {
  form: ReturnType<typeof useHackathonDetailsForm>;
  field: Extract<DetailsField, 'aiPolicyNote' | 'licenceNote'>;
  label: string;
  placeholder?: string;
  locale: Locale;
}) => {
  const id = detailsFieldId(field);
  const error = form.errors[field];
  return (
    <FormField
      id={id}
      label={label}
      isOptional
      optionalLabel={optional({}, { locale })}
      error={error}
    >
      <textarea
        id={id}
        className="textarea textarea-sm md:textarea-md w-full"
        rows={3}
        dir="auto"
        placeholder={placeholder}
        value={form.values[field]}
        disabled={form.isLocked(field)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? fieldNoteId(id) : undefined}
        onChange={(event) => form.set(field, event.target.value)}
      />
    </FormField>
  );
};
