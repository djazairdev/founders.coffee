import type { HackathonField, HackathonTypeTag } from '@founders-coffee/core';
import { HACKATHON_FIELDS, HACKATHON_TYPE_TAGS } from '@founders-coffee/core';
import { ChipGroup, toggleChip } from '@founders-coffee/ui';

import type { Locale } from '@founders-coffee/i18n';

import { hackathonClassificationCopy } from '../hackathon-classification-copy';

export const HackathonClassificationFields = ({
  locale,
  fields,
  typeTags,
  fieldsError,
  typeTagsError,
  onFieldsChange,
  onTypeTagsChange,
}: {
  locale: Locale;
  fields: readonly HackathonField[];
  typeTags: readonly HackathonTypeTag[];
  fieldsError?: string;
  typeTagsError?: string;
  onFieldsChange: (next: HackathonField[]) => void;
  onTypeTagsChange: (next: HackathonTypeTag[]) => void;
}) => {
  const copy = hackathonClassificationCopy(locale);
  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-body-sm font-medium text-base-content">
          {copy.fieldsLabel}
          <span
            id="hackathon-fields-required"
            className={`ms-2 text-caption ${fieldsError ? 'text-error' : 'text-neutral'}`}
          >
            {fieldsError ?? copy.required}
          </span>
        </h3>
        <ChipGroup
          id="hackathon-fields"
          options={HACKATHON_FIELDS}
          selected={fields}
          max={5}
          groupLabel={copy.fieldsLabel}
          describedBy="hackathon-fields-hint hackathon-fields-required"
          isInvalid={Boolean(fieldsError)}
          labelFor={copy.fieldLabel}
          onToggle={(field) => onFieldsChange(toggleChip(fields, field, 5))}
        />
        <p id="hackathon-fields-hint" className="text-caption text-neutral">
          {copy.fieldsHint}
        </p>
      </section>
      <section className="grid gap-2">
        <h3 className="text-body-sm font-medium text-base-content">
          {copy.typeTagsLabel}
          <span
            id="hackathon-type-tags-required"
            className={`ms-2 text-caption ${typeTagsError ? 'text-error' : 'text-neutral'}`}
          >
            {typeTagsError ?? copy.required}
          </span>
        </h3>
        <p id="hackathon-type-tags-hint" className="text-caption text-neutral">
          {copy.typeTagsQuestion}
        </p>
        <ChipGroup
          id="hackathon-type-tags"
          options={HACKATHON_TYPE_TAGS}
          selected={typeTags}
          max={HACKATHON_TYPE_TAGS.length}
          groupLabel={`${copy.typeTagsLabel}: ${copy.typeTagsQuestion}`}
          describedBy="hackathon-type-tags-hint hackathon-type-tags-required"
          isInvalid={Boolean(typeTagsError)}
          labelFor={copy.typeTagLabel}
          onToggle={(tag) =>
            onTypeTagsChange(
              toggleChip(typeTags, tag, HACKATHON_TYPE_TAGS.length),
            )
          }
        />
      </section>
    </div>
  );
};
