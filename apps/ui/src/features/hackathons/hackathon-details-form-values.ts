import type { AttendanceMode, HackathonAiPolicy } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import { getZonedWallClock, resolveZonedDateTime } from '@founders-coffee/i18n';

import type { HackathonDraftView } from './api';
import type { DateField } from './hackathon-details-date-time';

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

export type DeadlineField = Extract<
  DetailsField,
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'submissionDeadlineAt'
  | 'judgingEndsAt'
>;

export type SettingsField = Exclude<DetailsField, DeadlineField>;

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

export const DEADLINE_FIELD_ORDER: readonly DeadlineField[] = [
  'registrationOpensAt',
  'registrationClosesAt',
  'submissionDeadlineAt',
  'judgingEndsAt',
];

export const SETTINGS_FIELD_ORDER: readonly SettingsField[] = [
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

export const TEAM_SIZE_MAX = hackathons.TEAM_SIZE_CEILING;

const pad = (value: number) => String(value).padStart(2, '0');
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

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
  const dates = draft.deadlines ?? draft.details;
  const settings = draft.settings ?? draft.details;
  const defaults = dates
    ? null
    : {
        registrationOpensAt: draft.event.startsAt - 7 * DAY_MS,
        registrationClosesAt: draft.event.startsAt - HOUR_MS,
        submissionDeadlineAt: draft.event.endsAt,
        judgingEndsAt: draft.event.endsAt + 7 * DAY_MS,
      };
  const at = (value: number | undefined) =>
    value === undefined ? '' : localInput(value, timeZone);
  const text = (value: number | string | null | undefined) =>
    value === null || value === undefined ? '' : String(value);
  return {
    registrationOpensAt: at(
      dates?.registrationOpensAt ?? defaults?.registrationOpensAt,
    ),
    registrationClosesAt: at(
      dates?.registrationClosesAt ?? defaults?.registrationClosesAt,
    ),
    submissionDeadlineAt: at(
      dates?.submissionDeadlineAt ?? defaults?.submissionDeadlineAt,
    ),
    judgingEndsAt: at(dates?.judgingEndsAt ?? defaults?.judgingEndsAt),
    attendanceModes:
      settings?.attendanceModes ?? offeredModes(draft.event.format),
    teamMin: text(settings?.teamMin ?? 1),
    teamMax: text(settings?.teamMax ?? 4),
    capacity: text(settings?.capacity),
    minimumAge: text(settings?.minimumAge),
    rules: settings?.rules ?? '',
    aiPolicy: settings?.aiPolicy ?? null,
    aiPolicyNote: settings?.aiPolicyNote ?? '',
    licenceNote: settings?.licenceNote ?? '',
  };
};

const optionalNumber = (value: string) =>
  value.trim() === '' ? undefined : Number(value);
const optionalText = (value: string) =>
  value.trim() === '' ? undefined : value;

/**
 * The instant a date field names: the saved one while the field still shows it, since the field
 * keeps only minutes and a saved date may carry seconds, else the one the organiser entered.
 */
const dateOf = (
  field: DateField,
  values: DetailsFormValues,
  saved: Pick<NonNullable<HackathonDraftView['details']>, DeadlineField> | null,
  timeZone: string,
): number | undefined =>
  saved && values[field] === localInput(saved[field], timeZone)
    ? saved[field]
    : instantOf(values[field], timeZone);

/** The details the form holds, in the shape the server takes, before they are checked. */
export const detailsInput = (
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

export const deadlinesInput = (
  values: DetailsFormValues,
  draft: HackathonDraftView,
  timeZone: string,
) => {
  const saved = draft.deadlines ?? draft.details;
  return {
    registrationOpensAt: dateOf('registrationOpensAt', values, saved, timeZone),
    registrationClosesAt: dateOf(
      'registrationClosesAt',
      values,
      saved,
      timeZone,
    ),
    submissionDeadlineAt: dateOf(
      'submissionDeadlineAt',
      values,
      saved,
      timeZone,
    ),
    judgingEndsAt: dateOf('judgingEndsAt', values, saved, timeZone),
  };
};

export const settingsInput = (values: DetailsFormValues) => ({
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
