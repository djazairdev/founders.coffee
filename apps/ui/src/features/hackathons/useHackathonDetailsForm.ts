import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

import { hackathon_details_saved, type Locale } from '@founders-coffee/i18n';

import { seekField } from '../events/seek-field';
import type { HackathonDraftView } from './api';
import type { HackathonFeedback } from './hackathon-feedback';
import { lockedFieldsOf } from './details-locks';
import { hackathonEditError } from './edit-errors';
import {
  checkDeadlines,
  checkSettings,
  DEADLINE_FIELD_ORDER,
  initialDetailsValues,
  SETTINGS_FIELD_ORDER,
  type DetailsField,
  type DetailsFormErrors,
  type DetailsFormValues,
} from './hackathon-details-form';
import {
  useSaveHackathonDeadlines,
  useSaveHackathonSettings,
} from './hooks';

export const detailsFieldId = (field: DetailsField) => `hackathon-${field}`;

const FOCUSABLE = 'input, textarea, select, button';

/** Move focus to a field holding a section save back. */
const seekDetailsField = (field: DetailsField): void => {
  const element = document.getElementById(detailsFieldId(field));
  if (!element) return;
  const disclosure = element.closest('details');
  if (disclosure && !disclosure.open) disclosure.open = true;
  seekField(
    element.matches(FOCUSABLE)
      ? element
      : (element.querySelector<HTMLElement>(FOCUSABLE) ?? element),
  );
};

export type DetailsFormState = {
  readonly values: DetailsFormValues;
  readonly errors: DetailsFormErrors;
  readonly set: <F extends DetailsField>(
    field: F,
    value: DetailsFormValues[F],
  ) => void;
  readonly submit: () => void;
  readonly isLocked: (field: DetailsField) => boolean;
  readonly isSaving: boolean;
};

type FormOptions = {
  draft: HackathonDraftView;
  timeZone: string;
  locale: Locale;
  onFeedback: HackathonFeedback;
};

const useValues = (draft: HackathonDraftView, timeZone: string) =>
  useState(() => initialDetailsValues(draft, timeZone));

const useLockState = (draft: HackathonDraftView) => {
  const lockedFields = useMemo(
    () => lockedFieldsOf(draft, Date.now()),
    [draft],
  );
  return (field: DetailsField) => lockedFields.has(field);
};

const firstError = (
  fields: readonly DetailsField[],
  errors: DetailsFormErrors,
) => fields.find((field) => errors[field]);

export const useHackathonDeadlinesForm = ({
  draft,
  timeZone,
  locale,
  onFeedback,
}: FormOptions): DetailsFormState => {
  const save = useSaveHackathonDeadlines();
  const [values, setValues] = useValues(draft, timeZone);
  const [errors, setErrors] = useState<DetailsFormErrors>({});
  const isLocked = useLockState(draft);

  const set: DetailsFormState['set'] = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    save.reset();
  };

  const submit = () => {
    if (save.isPending) return;
    const checked = checkDeadlines(values, draft, timeZone, locale);
    if (!checked.ok) {
      flushSync(() => setErrors(checked.errors));
      const first = firstError(DEADLINE_FIELD_ORDER, checked.errors);
      if (first) {
        onFeedback(checked.errors[first] ?? '', 'error');
        seekDetailsField(first);
      }
      return;
    }
    setErrors({});
    save.mutate(
      {
        eventId: draft.event.id,
        version: draft.version,
        deadlines: checked.deadlines,
      },
      {
        onSuccess: () =>
          onFeedback(hackathon_details_saved({}, { locale }), 'success'),
        onError: (error) =>
          onFeedback(hackathonEditError(error, locale), 'error'),
      },
    );
  };

  return { values, errors, set, submit, isLocked, isSaving: save.isPending };
};

export const useHackathonSettingsForm = ({
  draft,
  timeZone,
  locale,
  onFeedback,
}: FormOptions): DetailsFormState => {
  const save = useSaveHackathonSettings();
  const [values, setValues] = useValues(draft, timeZone);
  const [errors, setErrors] = useState<DetailsFormErrors>({});
  const isLocked = useLockState(draft);

  const set: DetailsFormState['set'] = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    save.reset();
  };

  const submit = () => {
    if (save.isPending) return;
    const checked = checkSettings(values, draft, locale);
    if (!checked.ok) {
      flushSync(() => setErrors(checked.errors));
      const first = firstError(SETTINGS_FIELD_ORDER, checked.errors);
      if (first) {
        onFeedback(checked.errors[first] ?? '', 'error');
        seekDetailsField(first);
      }
      return;
    }
    setErrors({});
    save.mutate(
      {
        eventId: draft.event.id,
        version: draft.version,
        settings: checked.settings,
      },
      {
        onSuccess: () =>
          onFeedback(hackathon_details_saved({}, { locale }), 'success'),
        onError: (error) =>
          onFeedback(hackathonEditError(error, locale), 'error'),
      },
    );
  };

  return { values, errors, set, submit, isLocked, isSaving: save.isPending };
};
