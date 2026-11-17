import { formatDate, type Locale } from '@founders-coffee/i18n';

const CLOCK = { hour: '2-digit', minute: '2-digit' } as const;

const inZone = (
  value: Date,
  locale: Locale,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) => formatDate(value, locale, { timeZone, hour12: false, ...options });

/** The weekday, day and month an event falls on, in the market's time zone. */
export const eventDayLabel = (
  value: Date,
  locale: Locale,
  timeZone: string,
): string => {
  const names = locale === 'ar' ? 'long' : 'short';
  return inZone(value, locale, timeZone, {
    weekday: names,
    day: 'numeric',
    month: names,
  });
};

export const eventShortDateLabel = (
  value: Date,
  locale: Locale,
  timeZone: string,
): string =>
  inZone(value, locale, timeZone, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** The time on a clock in the market's time zone. */
export const eventClockLabel = (
  value: Date,
  locale: Locale,
  timeZone: string,
): string => inZone(value, locale, timeZone, CLOCK);

/** Whether an event ends on a later calendar day than it starts, where it happens. */
export const endsOnAnotherDay = (
  start: Date,
  end: Date,
  timeZone: string,
): boolean => {
  const day = (value: Date) =>
    inZone(value, 'en', timeZone, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  return day(start) !== day(end);
};
