import type { CurrencyCode, Money } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import {
  hackathon_prize_error_description,
  hackathon_prize_error_note,
  hackathon_prize_error_place,
  hackathon_prize_error_provider,
  hackathon_prize_error_title,
  hackathon_prize_error_value,
  host_error_invalid,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonPrizeView } from './api';

export const PRIZE_PLACE_MAX = hackathons.HACKATHON_PRIZE_PLACE_MAX;
export const NOTE_MIN = hackathons.HACKATHON_PRIZE_CONFIRMATION_NOTE_MIN_LENGTH;
export const NOTE_MAX = hackathons.HACKATHON_PRIZE_CONFIRMATION_NOTE_MAX_LENGTH;

const MINOR_PER_MAJOR = 100;

export type PrizeDraft = {
  readonly trackId: string;
  readonly place: string;
  readonly title: string;
  readonly description: string;
  readonly providerName: string;
  readonly value: string;
};

export type PrizeField = keyof PrizeDraft;

export type PrizeErrors = Partial<Record<PrizeField, string>>;

export type PrizeCheck =
  | { readonly ok: true; readonly prize: hackathons.HackathonPrizeInput }
  | {
      readonly ok: false;
      readonly errors: PrizeErrors;
      readonly first: PrizeField;
    };

const FIELD_ORDER: readonly PrizeField[] = [
  'trackId',
  'place',
  'title',
  'description',
  'providerName',
  'value',
];

/** The id of a prize form's field, for its label and for taking the organiser there. */
export const prizeFieldId = (formKey: string, field: PrizeField) =>
  `hackathon-prize-${formKey}-${field}`;

/** A new prize's form: for the whole hackathon, in first place. */
export const emptyPrize = (): PrizeDraft => ({
  trackId: '',
  place: '1',
  title: '',
  description: '',
  providerName: '',
  value: '',
});

/** An amount in minor units, written in major units the way an organiser types it back. */
export const majorText = (money: Money): string => {
  const whole = Math.trunc(money.amount_minor / MINOR_PER_MAJOR);
  const cents = money.amount_minor % MINOR_PER_MAJOR;
  return cents === 0
    ? String(whole)
    : `${whole}.${String(cents).padStart(2, '0')}`;
};

/** A saved prize as its form opens on it. */
export const prizeDraftOf = (prize: HackathonPrizeView): PrizeDraft => ({
  trackId: prize.trackId ?? '',
  place: String(prize.place),
  title: prize.title,
  description: prize.description,
  providerName: prize.providerName,
  value: prize.value ? majorText(prize.value) : '',
});

const toLatinDigits = (text: string) =>
  text.replace(/[٠-٩]/gu, (digit) => String(digit.charCodeAt(0) - 0x0660));

/**
 * The minor units an amount typed in major units stands for: whole units with at most two decimals
 * after a point or a comma, spaces allowed between thousands. `null` for anything else. Counted in
 * integers, never through a float.
 */
export const minorUnitsOf = (text: string): number | null => {
  const plain = toLatinDigits(text).replace(/[\s  ]/gu, '');
  const match = /^(\d{1,12})(?:[.,](\d{1,2}))?$/u.exec(plain);
  if (!match) return null;
  const [, whole = '0', fraction = ''] = match;
  return Number(whole) * MINOR_PER_MAJOR + Number(fraction.padEnd(2, '0'));
};

const messageFor = (field: PrizeField, locale: Locale): string => {
  const options = { locale };
  switch (field) {
    case 'place':
      return hackathon_prize_error_place({ max: PRIZE_PLACE_MAX }, options);
    case 'title':
      return hackathon_prize_error_title({}, options);
    case 'description':
      return hackathon_prize_error_description({}, options);
    case 'providerName':
      return hackathon_prize_error_provider({}, options);
    case 'value':
      return hackathon_prize_error_value({}, options);
    case 'trackId':
      return host_error_invalid({}, options);
  }
};

const valueOf = (
  text: string,
  currency: CurrencyCode,
): Money | null | 'invalid' => {
  if (text.trim() === '') return null;
  const amount = minorUnitsOf(text);
  return amount === null || amount === 0
    ? 'invalid'
    : { amount_minor: amount, currency };
};

/**
 * Check a prize form with the rules the server applies, valuing it in the hackathon's currency, and
 * name the first field holding it back.
 */
export const checkPrize = (
  draft: PrizeDraft,
  currency: CurrencyCode,
  locale: Locale,
): PrizeCheck => {
  const value = valueOf(draft.value, currency);
  const parsed = hackathons.hackathonPrizeSchema.safeParse({
    trackId: draft.trackId || null,
    place: Number(toLatinDigits(draft.place.trim())),
    title: draft.title,
    description: draft.description,
    providerName: draft.providerName,
    value: value === 'invalid' ? null : value,
  });
  const failed = new Set<PrizeField>(
    parsed.success
      ? []
      : parsed.error.issues.map((issue) => issue.path[0] as PrizeField),
  );
  if (value === 'invalid') failed.add('value');
  const first = FIELD_ORDER.find((field) => failed.has(field));
  if (!parsed.success || first) {
    const errors = Object.fromEntries(
      [...failed].map((field) => [field, messageFor(field, locale)]),
    );
    return { ok: false, errors, first: first ?? 'title' };
  }
  return { ok: true, prize: parsed.data };
};

/** The confirmation note as the server takes it, or the message that holds it back. */
export const checkConfirmationNote = (
  note: string,
  locale: Locale,
): { readonly note: string } | { readonly error: string } => {
  const parsed = hackathons.hackathonPrizeConfirmationSchema.safeParse(note);
  return parsed.success
    ? { note: parsed.data }
    : { error: hackathon_prize_error_note({ min: NOTE_MIN }, { locale }) };
};
