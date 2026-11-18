import type { Money } from '@founders-coffee/core';

import type { Locale } from './locale.js';

const ARABIC_INDIC = /[٠-٩]/;

const numberCache = new Map<string, Intl.NumberFormat>();
const numberFormatter = (locale: Locale, options: Intl.NumberFormatOptions) => {
  const key = `${locale}:${JSON.stringify(options)}`;
  const cached = numberCache.get(key);
  if (cached) return cached;
  const fmt = new Intl.NumberFormat(locale, {
    numberingSystem: 'latn',
    ...options,
  });
  numberCache.set(key, fmt);
  return fmt;
};

/**
 * The options a date formatter is built with, chosen so that every engine writes the same text.
 *
 * CLDR gives Arabic no short weekday names, so V8, on the server and in Chrome, writes the full name
 * where a short one is asked for. Apple's ICU, under every browser on an iPhone, has short names of
 * its own without the article (اثنين for الاثنين), so a page the server rendered hydrated there
 * with other text, and React threw the server's HTML away. Arabic asks for the full name instead:
 * the text V8 already writes, and the text Apple's ICU writes too.
 */
const portableDateOptions = (
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions =>
  locale === 'ar' && options.weekday === 'short'
    ? { ...options, weekday: 'long' }
    : options;

const dateCache = new Map<string, Intl.DateTimeFormat>();
const dateFormatter = (
  locale: Locale,
  requested: Intl.DateTimeFormatOptions,
) => {
  const options = portableDateOptions(locale, requested);
  const key = `${locale}:${JSON.stringify(options)}`;
  const cached = dateCache.get(key);
  if (cached) return cached;
  const fmt = new Intl.DateTimeFormat(locale, {
    numberingSystem: 'latn',
    ...options,
  });
  dateCache.set(key, fmt);
  return fmt;
};

/** Format a Money value (minor units) per locale; CLDR controls decimals. */
export const formatMoney = (money: Money, locale: Locale): string => {
  const major = money.amount_minor / 100;
  return numberFormatter(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(major);
};

/** Format a number per locale with Latin digits. */
export const formatNumber = (
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string => numberFormatter(locale, options).format(value);

/**
 * Format a date/time in the given IANA timezone per locale.
 * Pass the event's market/city timezone, not the viewer's.
 */
export const formatDate = (
  date: Date,
  locale: Locale,
  options: { timeZone: string } & Intl.DateTimeFormatOptions,
): string => dateFormatter(locale, options).format(date);

/** True if a formatted string is free of Arabic-Indic digits (Latin-digit guard). */
export const hasOnlyLatinDigits = (formatted: string): boolean =>
  !ARABIC_INDIC.test(formatted);

export type CalendarDayParts = {
  readonly weekday: string;
  readonly day: string;
  readonly month: string;
  readonly year: string;
};

const calendarDayCache = new Map<string, Intl.DateTimeFormat>();

/**
 * A calendar day's weekday, day, month and year as one market names them, for copy that puts them
 * in its own order.
 *
 * The day is `YYYY-MM-DD` and names no instant, so it is read at noon UTC, where no time zone can
 * move it to another date. The language takes the market as its region: Arabic in Algeria names
 * January جانفي where bare Arabic writes يناير, and V8 and Apple's ICU agree on both. The message
 * decides the order, so English can read "Friday 22 January" rather than the bare formatter's
 * "Friday, January 22".
 */
export const calendarDayParts = (
  isoDay: string,
  locale: Locale,
  marketCode: string,
): CalendarDayParts => {
  const tag = `${locale}-${marketCode}`;
  const formatter =
    calendarDayCache.get(tag) ??
    new Intl.DateTimeFormat(tag, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
      numberingSystem: 'latn',
    });
  calendarDayCache.set(tag, formatter);
  const parts = formatter.formatToParts(new Date(`${isoDay}T12:00:00Z`));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return {
    weekday: part('weekday'),
    day: part('day'),
    month: part('month'),
    year: part('year'),
  };
};
