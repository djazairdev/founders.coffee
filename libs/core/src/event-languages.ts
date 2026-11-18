import type { Locale } from './locale.js';

/**
 * The languages a stored meetup is held in, never an empty list.
 *
 * Every meetup that existed when meetups began to list several languages was given its one
 * language as its list, but a Worker rolled back past that change still writes new ones with the
 * list left empty. Reading the lead language as the list keeps such a meetup on its card and under
 * the language filters instead of listing it in no language at all.
 */
export const eventLanguages = (event: {
  readonly languages: readonly string[];
  readonly language: Locale;
}): readonly string[] =>
  event.languages.length > 0 ? event.languages : [event.language];

const count = (text: string, script: RegExp): number =>
  text.match(script)?.length ?? 0;

const ARABIC_SCRIPT = /\p{Script=Arabic}/gu;
const LATIN_SCRIPT = /\p{Script=Latin}/gu;
const ARABIC_ONLY: readonly string[] = ['ar'];
const EITHER_SCRIPT: readonly string[] = ['ber'];

/**
 * The language to mark a host's text with, or `undefined` when it cannot be told.
 *
 * An event stores the languages it is held in, not the one its text is written in, and an untouched
 * choice follows the page the host was reading. So a stored language only names the text when its
 * script fits, and when it is the only one of the event's languages that does: Arabic text on an
 * event held in Arabic and French is Arabic, but French or English text on one held in both cannot
 * be told apart. No mark is better than the wrong one, which reads the text with the wrong voice.
 */
export const textLanguage = (
  text: string,
  languages: readonly string[],
): string | undefined => {
  const arabic = count(text, ARABIC_SCRIPT);
  const latin = count(text, LATIN_SCRIPT);
  if (arabic === 0 && latin === 0) return undefined;
  const isArabic = arabic > latin;
  const fitting = languages.filter(
    (language) =>
      EITHER_SCRIPT.includes(language) ||
      ARABIC_ONLY.includes(language) === isArabic,
  );
  return fitting.length === 1 ? fitting[0] : undefined;
};
