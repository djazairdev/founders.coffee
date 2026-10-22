import { useState } from 'react';
import { flushSync } from 'react-dom';

import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_details_error_rate_limited,
  hackathon_details_error_save,
  hackathon_manage_locked,
  host_error_invalid,
  type Locale,
} from '@founders-coffee/i18n';

import { seekField } from '../events/seek-field';
import type { HackathonDraftView } from './api';
import {
  checkDetails,
  DETAILS_FIELD_ORDER,
  initialDetailsValues,
  type DetailsField,
  type DetailsFormErrors,
  type DetailsFormValues,
} from './hackathon-details-form';
import { useSaveHackathonDetails } from './hooks';

export const detailsFieldId = (field: DetailsField) => `hackathon-${field}`;

const FOCUSABLE = 'input, textarea, select, button';

/** Take the organiser to a field holding the form back, or to the first control inside a group. */
const seekDetailsField = (field: DetailsField): void => {
  const element = document.getElementById(detailsFieldId(field));
  if (!element) return;
  seekField(
    element.matches(FOCUSABLE)
      ? element
      : (element.querySelector<HTMLElement>(FOCUSABLE) ?? element),
  );
};

const saveErrorMessage = (error: unknown, locale: Locale): string => {
  switch (appErrorCode(error)) {
    case 'rate_limited':
      return hackathon_details_error_rate_limited({}, { locale });
    case 'hackathon_not_editable':
      return hackathon_manage_locked({}, { locale });
    case 'validation_failed':
      return host_error_invalid({}, { locale });
    default:
      return hackathon_details_error_save({}, { locale });
  }
};

/**
 * The organiser flow's second step as a form (B-HKN-12): the values, the check Save runs before it
 * sends anything, and the save itself.
 *
 * Save checks every field with the rule the server applies, against the saved kickoff, demo day and
 * format, and takes the organiser to the first field holding it back. A field's message goes as
 * soon as it changes; "saved" stays until the next change.
 */
export const useHackathonDetailsForm = ({
  draft,
  timeZone,
  locale,
}: {
  draft: HackathonDraftView;
  timeZone: string;
  locale: Locale;
}) => {
  const save = useSaveHackathonDetails();
  const [values, setValues] = useState(() =>
    initialDetailsValues(draft, timeZone),
  );
  const [errors, setErrors] = useState<DetailsFormErrors>({});

  const set = <F extends DetailsField>(
    field: F,
    value: DetailsFormValues[F],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    save.reset();
  };

  const submit = () => {
    if (save.isPending) return;
    const check = checkDetails(values, draft.event, timeZone, locale);
    if (!check.ok) {
      flushSync(() => setErrors(check.errors));
      const first = DETAILS_FIELD_ORDER.find((field) => check.errors[field]);
      if (first) seekDetailsField(first);
      return;
    }
    setErrors({});
    save.mutate({ eventId: draft.event.id, details: check.details });
  };

  return {
    values,
    errors,
    set,
    submit,
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    saveError: save.isError ? saveErrorMessage(save.error, locale) : null,
  };
};
