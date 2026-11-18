import { hackathons } from '@founders-coffee/domain';
import {
  hackathon_details_error_ai_policy,
  hackathon_details_error_ai_policy_note_required,
  hackathon_details_error_attendance,
  hackathon_details_error_judging_ends,
  hackathon_details_error_length,
  hackathon_details_error_registration_closes,
  hackathon_details_error_registration_opens,
  hackathon_details_error_submission_deadline,
  hackathon_details_error_team_max,
  hackathon_details_error_team_min,
  hackathon_details_error_whole_number,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonDraftView } from './api';
import {
  DEADLINE_FIELD_ORDER,
  DETAILS_FIELD_ORDER,
  SETTINGS_FIELD_ORDER,
  TEAM_SIZE_MAX,
  type DeadlineField,
  type DetailsField,
  type DetailsFormErrors,
  type DetailsFormValues,
  type SettingsField,
  deadlinesInput,
  detailsInput,
  settingsInput,
} from './hackathon-details-form-values';
import {
  DATE_TIME_FIELDS,
  dateTimeInputMessage,
  missingDateMessage,
  type DateField,
} from './hackathon-details-date-time';

const FIELD_OF_PATH: Readonly<Record<string, DetailsField>> = {
  endsAt: 'submissionDeadlineAt',
};

const messageFor = (field: DetailsField, locale: Locale): string => {
  const options = { locale };
  switch (field) {
    case 'registrationOpensAt':
      return hackathon_details_error_registration_opens({}, options);
    case 'registrationClosesAt':
      return hackathon_details_error_registration_closes({}, options);
    case 'submissionDeadlineAt':
      return hackathon_details_error_submission_deadline({}, options);
    case 'judgingEndsAt':
      return hackathon_details_error_judging_ends({}, options);
    case 'attendanceModes':
      return hackathon_details_error_attendance({}, options);
    case 'teamMin':
      return hackathon_details_error_team_min({ max: TEAM_SIZE_MAX }, options);
    case 'teamMax':
      return hackathon_details_error_team_max({ max: TEAM_SIZE_MAX }, options);
    case 'capacity':
      return hackathon_details_error_whole_number(
        { max: hackathons.HACKATHON_CAPACITY_MAX },
        options,
      );
    case 'minimumAge':
      return hackathon_details_error_whole_number(
        { max: hackathons.HACKATHON_MINIMUM_AGE_MAX },
        options,
      );
    case 'rules':
      return hackathon_details_error_length(
        { max: hackathons.HACKATHON_RULES_MAX_LENGTH },
        options,
      );
    case 'aiPolicy':
      return hackathon_details_error_ai_policy({}, options);
    case 'aiPolicyNote':
    case 'licenceNote':
      return hackathon_details_error_length(
        { max: hackathons.HACKATHON_NOTE_MAX_LENGTH },
        options,
      );
  }
};

const issueMessage = (
  field: DetailsField,
  values: DetailsFormValues,
  locale: Locale,
): string =>
  DATE_TIME_FIELDS.includes(field as DateField) && values[field] === ''
    ? missingDateMessage(field as DateField, locale)
    : field === 'aiPolicyNote' &&
        values.aiPolicy === 'conditional' &&
        values.aiPolicyNote.trim() === ''
      ? hackathon_details_error_ai_policy_note_required({}, { locale })
      : messageFor(field, locale);

export type DetailsCheck =
  | {
      readonly ok: true;
      readonly details: hackathons.HackathonDetailsInput;
    }
  | { readonly ok: false; readonly errors: DetailsFormErrors };

export type DeadlinesCheck =
  | {
      readonly ok: true;
      readonly deadlines: hackathons.HackathonDeadlinesInput;
    }
  | { readonly ok: false; readonly errors: DetailsFormErrors };

export type SettingsCheck =
  | { readonly ok: true; readonly settings: hackathons.HackathonSettingsInput }
  | { readonly ok: false; readonly errors: DetailsFormErrors };

const eventFrameOf = (draft: HackathonDraftView) => ({
  startsAt: draft.event.startsAt,
  endsAt: draft.event.endsAt,
  format: draft.event.format,
});

export const checkDeadlines = (
  values: DetailsFormValues,
  draft: HackathonDraftView,
  timeZone: string,
  locale: Locale,
): DeadlinesCheck => {
  const parsed = hackathons
    .hackathonDeadlinesFor(eventFrameOf(draft))
    .safeParse(deadlinesInput(values, draft, timeZone));
  const inputErrors: DetailsFormErrors = {};
  for (const field of DEADLINE_FIELD_ORDER) {
    const message = dateTimeInputMessage(
      values[field],
      timeZone,
      locale,
      missingDateMessage(field, locale),
    );
    if (message) inputErrors[field] = message;
  }
  if (parsed.success && Object.keys(inputErrors).length === 0)
    return { ok: true, deadlines: parsed.data };
  const errors: DetailsFormErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = String(issue.path[0]);
      const field = FIELD_OF_PATH[path] ?? (path as DetailsField);
      if (DEADLINE_FIELD_ORDER.includes(field as DeadlineField))
        errors[field as DeadlineField] = issueMessage(field, values, locale);
    }
  }
  Object.assign(errors, inputErrors);
  return { ok: false, errors };
};

export const checkSettings = (
  values: DetailsFormValues,
  draft: HackathonDraftView,
  locale: Locale,
): SettingsCheck => {
  const parsed = hackathons
    .hackathonSettingsFor(eventFrameOf(draft))
    .safeParse(settingsInput(values));
  if (parsed.success) return { ok: true, settings: parsed.data };
  const errors: DetailsFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0]) as SettingsField;
    if (SETTINGS_FIELD_ORDER.includes(field))
      errors[field] = issueMessage(field, values, locale);
  }
  return { ok: false, errors };
};

/**
 * Check the form with the same rule the server holds the details to, against the saved event, and
 * name each field holding it back with what that field needs. A timeline issue the rule files under
 * kickoff or demo day belongs to the date the organiser can move: registration's close, or the
 * submission deadline.
 */
export const checkDetails = (
  values: DetailsFormValues,
  draft: HackathonDraftView,
  timeZone: string,
  locale: Locale,
): DetailsCheck => {
  const parsed = hackathons
    .hackathonDetailsFor(eventFrameOf(draft))
    .safeParse(detailsInput(values, draft.details, timeZone));
  const inputErrors: DetailsFormErrors = {};
  for (const field of DATE_TIME_FIELDS) {
    const message = dateTimeInputMessage(
      values[field],
      timeZone,
      locale,
      missingDateMessage(field, locale),
    );
    if (message) inputErrors[field] = message;
  }
  if (parsed.success && Object.keys(inputErrors).length === 0)
    return { ok: true, details: parsed.data };
  const errors: DetailsFormErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = String(issue.path[0]);
      const field = FIELD_OF_PATH[path] ?? (path as DetailsField);
      if (DETAILS_FIELD_ORDER.includes(field))
        errors[field] = issueMessage(field, values, locale);
    }
  }
  Object.assign(errors, inputErrors);
  return { ok: false, errors };
};
