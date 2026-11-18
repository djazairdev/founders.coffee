import {
  hackathon_details_error_judging_ends_missing,
  hackathon_details_error_registration_closes_missing,
  hackathon_details_error_registration_opens,
  hackathon_details_error_submission_deadline_missing,
  hackathon_date_invalid,
  hackathon_details_time_unavailable,
  hackathon_time_invalid_format,
  resolveZonedDateTime,
  type Locale,
} from '@founders-coffee/i18n';

import { parseDateValue } from './hackathon-date';

export type DateField =
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'submissionDeadlineAt'
  | 'judgingEndsAt';

export const DATE_TIME_FIELDS: readonly DateField[] = [
  'registrationOpensAt',
  'registrationClosesAt',
  'submissionDeadlineAt',
  'judgingEndsAt',
];

const MISSING_DATE_MESSAGES = {
  registrationOpensAt: hackathon_details_error_registration_opens,
  registrationClosesAt: hackathon_details_error_registration_closes_missing,
  submissionDeadlineAt: hackathon_details_error_submission_deadline_missing,
  judgingEndsAt: hackathon_details_error_judging_ends_missing,
} as const;

export const missingDateMessage = (field: DateField, locale: Locale): string =>
  MISSING_DATE_MESSAGES[field]({}, { locale });

export const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const splitDateTimeValue = (
  value: string,
): { date: string; time: string } => {
  const [date = '', time = ''] = value.split('T');
  return { date, time };
};

export const combineDateAndTime = (date: string, time: string): string =>
  date || time ? `${date}T${time}` : '';

export const dateTimeInputMessage = (
  value: string,
  timeZone: string,
  locale: Locale,
  missingMessage: string,
): string | undefined => {
  const { date, time } = splitDateTimeValue(value);
  if (!date) return missingMessage;
  if (!parseDateValue(date, timeZone))
    return hackathon_date_invalid({}, { locale });
  if (!TIME_PATTERN.test(time))
    return hackathon_time_invalid_format({}, { locale });
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
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
  return resolved.ok
    ? undefined
    : hackathon_details_time_unavailable({}, { locale });
};
