import type { ReactNode } from 'react';

import {
  optional,
  org_apply_name,
  org_apply_description,
  org_apply_website,
  type Locale,
} from '@founders-coffee/i18n';
import { fieldNoteId, FormField, Input } from '@founders-coffee/ui';

import {
  DESCRIPTION_LENGTH,
  NAME_LENGTH,
  type ApplicationDraft,
  type ApplicationField,
} from '../application';

type Details = Pick<ApplicationDraft, 'name' | 'description' | 'websiteUrl'>;
type Field = Exclude<ApplicationField, 'kind'>;

export const OrganisationDetailsFields = ({
  locale,
  draft,
  isBusy,
  errorFor,
  change,
  bind,
  children,
}: {
  locale: Locale;
  draft: Details;
  isBusy: boolean;
  errorFor: (field: Field) => string | null;
  change: (field: Field, next: Details) => void;
  bind: (
    field: Field,
  ) => (element: HTMLInputElement | HTMLTextAreaElement | null) => void;
  children?: ReactNode;
}) => {
  const optionalLabel = optional({}, { locale });
  const describe = (field: Field, id: string) => ({
    'aria-invalid': errorFor(field) ? (true as const) : undefined,
    'aria-describedby': errorFor(field) ? fieldNoteId(id) : undefined,
  });
  return (
    <>
      <FormField
        error={errorFor('name')}
        id="organisation-name"
        label={org_apply_name({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <Input
          {...describe('name', 'organisation-name')}
          autoComplete="organization"
          disabled={isBusy}
          id="organisation-name"
          maxLength={NAME_LENGTH.max}
          onChange={(event) =>
            change('name', { ...draft, name: event.target.value })
          }
          ref={bind('name')}
          value={draft.name}
        />
      </FormField>
      {children}
      <FormField
        aside={
          <span className="shrink-0 text-caption text-neutral" dir="ltr">
            {draft.description.trim().length} / {DESCRIPTION_LENGTH.max}
          </span>
        }
        error={errorFor('description')}
        id="organisation-description"
        label={org_apply_description({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <textarea
          {...describe('description', 'organisation-description')}
          className="textarea textarea-sm md:textarea-md w-full"
          dir="auto"
          disabled={isBusy}
          id="organisation-description"
          maxLength={DESCRIPTION_LENGTH.max}
          onChange={(event) =>
            change('description', {
              ...draft,
              description: event.target.value,
            })
          }
          ref={bind('description')}
          rows={5}
          value={draft.description}
        />
      </FormField>
      <FormField
        error={errorFor('websiteUrl')}
        id="organisation-website"
        isOptional
        label={org_apply_website({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <Input
          {...describe('websiteUrl', 'organisation-website')}
          autoComplete="url"
          disabled={isBusy}
          id="organisation-website"
          inputMode="url"
          onChange={(event) =>
            change('websiteUrl', { ...draft, websiteUrl: event.target.value })
          }
          placeholder="https://"
          ref={bind('websiteUrl')}
          type="url"
          value={draft.websiteUrl}
        />
      </FormField>
    </>
  );
};
