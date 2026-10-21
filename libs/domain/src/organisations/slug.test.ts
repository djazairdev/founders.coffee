import { describe, expect, it } from 'vitest';

import { organisationSlugSchema } from './schemas.js';
import { suggestOrganisationSlug } from './slug.js';

describe('suggestOrganisationSlug', () => {
  it('offers a lowercase hyphenated address without accents', () => {
    expect(suggestOrganisationSlug('École 42 Alger')).toBe('ecole-42-alger');
    expect(suggestOrganisationSlug('  Oran   Makers & Co. ')).toBe(
      'oran-makers-co',
    );
  });

  it('offers nothing for a name in Arabic script', () => {
    expect(suggestOrganisationSlug('نادي البرمجة')).toBe('');
  });

  it('keeps the Latin part of a mixed name', () => {
    expect(suggestOrganisationSlug('نادي GDG Algiers')).toBe('gdg-algiers');
  });

  it('cuts a long name at a word to fit', () => {
    const slug = suggestOrganisationSlug(
      'The Very Long Name Of A University Club For Founders In Constantine',
    );
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).toBe('the-very-long-name-of-a-university-club');
  });

  it('offers nothing too short or reserved', () => {
    expect(suggestOrganisationSlug('AI')).toBe('');
    expect(suggestOrganisationSlug('Admin')).toBe('');
    expect(suggestOrganisationSlug('Founders Coffee')).toBe('');
  });

  it('only ever offers an address the schema accepts', () => {
    for (const name of [
      'Club Ibn Khaldoun — Tlemcen',
      'USTHB_Dev',
      'شركة Yassir',
      'Ça Marche!!',
      'a'.repeat(60),
    ]) {
      const slug = suggestOrganisationSlug(name);
      if (slug)
        expect(organisationSlugSchema.safeParse(slug).success).toBe(true);
    }
  });
});
