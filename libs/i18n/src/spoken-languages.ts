import type { Locale } from './locale.js';
import {
  locale_ar,
  locale_en,
  locale_fr,
  spoken_ber,
  spoken_de,
  spoken_es,
} from './paraglide/messages.js';

const SPOKEN_LANGUAGE_MESSAGES = {
  ar: locale_ar,
  fr: locale_fr,
  en: locale_en,
  es: spoken_es,
  de: spoken_de,
  ber: spoken_ber,
} as const;

export type SpokenLanguageCode = keyof typeof SPOKEN_LANGUAGE_MESSAGES;

/** Whether a stored language code is one the product names. */
export const isSpokenLanguageCode = (
  code: string,
): code is SpokenLanguageCode => Object.hasOwn(SPOKEN_LANGUAGE_MESSAGES, code);

/** Name a spoken language in the reader's language, for every app that lists one. */
export const spokenLanguageName = (
  code: SpokenLanguageCode,
  locale: Locale,
): string => SPOKEN_LANGUAGE_MESSAGES[code]({}, { locale });
