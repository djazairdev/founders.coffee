import type { AttendanceMode, HackathonAiPolicy } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import {
  getZonedWallClock,
  hackathon_details_error_ai_policy,
  hackathon_details_error_attendance,
  hackathon_details_error_judging_ends,
  hackathon_details_error_judging_ends_missing,
  hackathon_details_error_length,
  hackathon_details_error_registration_closes,
  hackathon_details_error_registration_closes_missing,
  hackathon_details_error_registration_opens,
  hackathon_details_error_submission_deadline,
  hackathon_details_error_submission_deadline_missing,
  hackathon_details_error_team_max,
  hackathon_details_error_team_min,
  hackathon_details_error_whole_number,
  resolveZonedDateTime,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonDraftView } from './api';

export const TEAM_SIZE_MAX = hackathons.TEAM_SIZE_CEILING;

export type DetailsFormValues = {
  readonly registrationOpensAt: string;
  readonly registrationClosesAt: string;
  readonly submissionDeadlineAt: string;
  readonly judgingEndsAt: string;
  readonly attendanceModes: readonly AttendanceMode[];
  readonly teamMin: string;
  readonly teamMax: string;
  readonly capacity: string;
  readonly minimumAge: string;
  readonly rules: string;
  readonly aiPolicy: HackathonAiPolicy | null;
  readonly aiPolicyNote: string;
  readonly licenceNote: string;
};

export type DetailsField = keyof DetailsFormValues;

export type DetailsFormErrors = Partial<Record<DetailsField, string>>;

export const DETAILS_FIELD_ORDER: readonly DetailsField[] = [
  'registrationOpensAt',
  'registrationClosesAt',
  'submissionDeadlineAt',
  'judgingEndsAt',
  'attendanceModes',
  'teamMin',
  'teamMax',
  'capacity',
  'minimumAge',
  'rules',
  'aiPolicy',
  'aiPolicyNote',
  'licenceNote',
];

const pad = (value: number) => String(value).padStart(2, '0');

/** An instant as a `datetime-local` value, `YYYY-MM-DDTHH:MM`, on the market's wall clock. */
export const localInput = (epochMs: number, timeZone: string): string => {
  const clock = getZonedWallClock(epochMs, timeZone);
  return `${clock.year}-${pad(clock.month)}-${pad(clock.day)}T${pad(clock.hour)}:${pad(clock.minute)}`;
};

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** A `datetime-local` value read on the market's wall clock, or `undefined` when it names no instant. */
export const instantOf = (
  value: string,
  timeZone: string,
): number | undefined => {
  const match = LOCAL_INPUT.exec(value);
  if (!match) return undefined;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const resolved = resolveZonedDateTime(
    {
      year: year ?? 0,
      month: month ?? 0,
      day: day ?? 0,
      hour: hour ?? 0,
      minute: minute ?? 0,
    },
    timeZone,
  );
  return resolved.ok ? resolved.epochMs : undefined;
};

export const offeredModes = (
  format: HackathonDraftView['event']['format'],
): AttendanceMode[] =>
  format === 'hybrid' ? ['in_person', 'online'] : [format];

/** The form as the saved details fill it, or as a new hackathon starts: no date or AI policy chosen. */
export const initialDetailsValues = (
  draft: HackathonDraftView,
  timeZone: string,
): DetailsFormValues => {
  const { details } = draft;
  const at = (value: number | undefined) =>
    value === undefined ? '' : localInput(value, timeZone);
  const text = (value: number | string | null | undefined) =>
    value === null || value === undefined ? '' : String(value);
  return {
    registrationOpensAt: at(details?.registrationOpensAt),
    registrationClosesAt: at(details?.registrationClosesAt),
    submissionDeadlineAt: at(details?.submissionDeadlineAt),
    judgingEndsAt: at(details?.judgingEndsAt),
    attendanceModes:
      details?.attendanceModes ?? offeredModes(draft.event.format),
    teamMin: text(details?.teamMin ?? 1),
    teamMax: text(details?.teamMax ?? 4),
    capacity: text(details?.capacity),
    minimumAge: text(details?.minimumAge),
    rules: details?.rules ?? '',
    aiPolicy: details?.aiPolicy ?? null,
    aiPolicyNote: details?.aiPolicyNote ?? '',
    licenceNote: details?.licenceNote ?? '',
  };
};

const optionalNumber = (value: string) =>
  value.trim() === '' ? undefined : Number(value);
const optionalText = (value: string) =>
  value.trim() === '' ? undefined : value;

type DateField =
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'submissionDeadlineAt'
  | 'judgingEndsAt';

/**
 * The instant a date field names: the saved one while the field still shows it, since the field
 * keeps only minutes and a saved date may carry seconds, else the one the organiser entered.
 */
const dateOf = (
  field: DateField,
  values: DetailsFormValues,
  saved: HackathonDraftView['details'],
  timeZone: string,
): number | undefined =>
  saved && values[field] === localInput(saved[field], timeZone)
    ? saved[field]
    : instantOf(values[field], timeZone);

/** The details the form holds, in the shape the server takes, before they are checked. */
const detailsInput = (
  values: DetailsFormValues,
  saved: HackathonDraftView['details'],
  timeZone: string,
) => ({
  registrationOpensAt: dateOf('registrationOpensAt', values, saved, timeZone),
  registrationClosesAt: dateOf('registrationClosesAt', values, saved, timeZone),
  submissionDeadlineAt: dateOf('submissionDeadlineAt', values, saved, timeZone),
  judgingEndsAt: dateOf('judgingEndsAt', values, saved, timeZone),
  attendanceModes: [...values.attendanceModes],
  teamMin: Number(values.teamMin),
  teamMax: Number(values.teamMax),
  capacity: optionalNumber(values.capacity),
  minimumAge: optionalNumber(values.minimumAge),
  rules: optionalText(values.rules),
  aiPolicy: values.aiPolicy ?? undefined,
  aiPolicyNote: optionalText(values.aiPolicyNote),
  licenceNote: optionalText(values.licenceNote),
});

const FIELD_OF_PATH: Readonly<Record<string, DetailsField>> = {
  startsAt: 'registrationClosesAt',
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

const MISSING_DATE_MESSAGES = {
  registrationOpensAt: hackathon_details_error_registration_opens,
  registrationClosesAt: hackathon_details_error_registration_closes_missing,
  submissionDeadlineAt: hackathon_details_error_submission_deadline_missing,
  judgingEndsAt: hackathon_details_error_judging_ends_missing,
} as const;

/** What a field needs: a date left empty asks for one, before any rule about its order applies. */
const issueMessage = (
  field: DetailsField,
  values: DetailsFormValues,
  locale: Locale,
): string =>
  field in MISSING_DATE_MESSAGES && values[field] === ''
    ? MISSING_DATE_MESSAGES[field as keyof typeof MISSING_DATE_MESSAGES](
        {},
        { locale },
      )
    : messageFor(field, locale);

export type DetailsCheck =
  | {
      readonly ok: true;
      readonly details: hackathons.HackathonDetailsInput;
    }
  | { readonly ok: false; readonly errors: DetailsFormErrors };

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
  const { event } = draft;
  const parsed = hackathons
    .hackathonDetailsFor({
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      format: event.format,
    })
    .safeParse(detailsInput(values, draft.details, timeZone));
  if (parsed.success) return { ok: true, details: parsed.data };
  const errors: DetailsFormErrors = {};
  for (const issue of parsed.error.issues) {
    const path = String(issue.path[0]);
    const field = FIELD_OF_PATH[path] ?? (path as DetailsField);
    if (DETAILS_FIELD_ORDER.includes(field))
      errors[field] = issueMessage(field, values, locale);
  }
  return { ok: false, errors };
};
