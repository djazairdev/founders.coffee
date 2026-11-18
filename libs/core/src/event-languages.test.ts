import { describe, expect, it } from 'vitest';

import { eventLanguages, textLanguage } from './event-languages.js';

describe('the languages a stored meetup is held in', () => {
  it('are the ones the host listed, in their order', () => {
    expect(eventLanguages({ languages: ['fr', 'ar'], language: 'fr' })).toEqual(
      ['fr', 'ar'],
    );
  });

  it('are its lead language alone when a rolled-back Worker left the list empty', () => {
    expect(
      eventLanguages({ languages: [], language: 'ar' }),
      'an empty list put the meetup under no language filter and left its card without one',
    ).toEqual(['ar']);
  });
});

describe('textLanguage', () => {
  it('names the only language held in, when the script fits', () => {
    expect(textLanguage('Rencontre des fondateurs', ['fr'])).toBe('fr');
    expect(textLanguage('لقاء المؤسسين', ['ar'])).toBe('ar');
  });

  it('tells Arabic from Latin text on an event held in both', () => {
    expect(textLanguage('لقاء المؤسسين', ['ar', 'fr'])).toBe('ar');
    expect(textLanguage('Rencontre des fondateurs', ['ar', 'fr'])).toBe('fr');
  });

  it('goes by the script most of the text is in', () => {
    expect(textLanguage('لقاء المؤسسين في Alger', ['ar', 'fr'])).toBe('ar');
  });

  it.each([
    ['two Latin languages', 'Founders meetup', ['fr', 'en']],
    ['a language written in either script', 'Tamazight', ['ber', 'fr']],
    ['Arabic text held only in French', 'لقاء المؤسسين', ['fr']],
    ['Latin text held only in Arabic', 'Founders meetup', ['ar']],
    ['text with no letters', '2026 🚀', ['fr']],
  ])('marks nothing for %s', (_label, text, languages) => {
    expect(textLanguage(text, languages)).toBeUndefined();
  });
});
