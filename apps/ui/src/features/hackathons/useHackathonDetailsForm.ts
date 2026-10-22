import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_details_error_conflict,
  hackathon_details_error_locked,
  hackathon_details_error_rate_limited,
  hackathon_details_error_save,
  hackathon_manage_locked,
  host_error_invalid,
  type Locale,
} from '@founders-coffee/i18n';

import { seekField } from '../events/seek-field';
import type { HackathonDraftView } from './api';
import { lockedFieldsOf } from './details-locks';
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
    case 'hackathon_conflict':
      return hackathon_details_error_conflict({}, { locale });
    case 'hackathon_field_locked':
      return hackathon_details_error_locked({}, { locale });
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
 * soon as it changes; "saved" stays until the next change. Once registration is open, the fields
 * the hackathon's promise fixes are locked (B-HKN-07), and every save names the version it was
 * built from, so one made from a stale page is refused rather than landing over a newer one.
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
  const lockedFields = useMemo(
    () => lockedFieldsOf(draft, Date.now()),
    [draft],
  );

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
    const check = checkDetails(values, draft, timeZone, locale);
    if (!check.ok) {
      flushSync(() => setErrors(check.errors));
      const first = DETAILS_FIELD_ORDER.find((field) => check.errors[field]);
      if (first) seekDetailsField(first);
      return;
    }
    setErrors({});
    save.mutate({
      eventId: draft.event.id,
      version: draft.version,
      details: check.details,
    });
  };

  return {
    values,
    errors,
    set,
    submit,
    isLocked: (field: DetailsField) => lockedFields.has(field),
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    saveError: save.isError ? saveErrorMessage(save.error, locale) : null,
  };
};
