import { describe, expect, it } from 'vitest';

import { organisationSlugSchema } from './schemas.js';
import { organisationSlugFor, suggestOrganisationSlug } from './slug.js';

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

describe('organisationSlugFor', () => {
  it.each(['نادي البرمجة', 'AI', 'Admin', 'Founders Coffee', 'a'.repeat(80)])(
    'allocates a valid fallback or shortened address for %s',
    (name) => {
      const slug = organisationSlugFor(name, '12345678');
      expect(organisationSlugSchema.safeParse(slug).success).toBe(true);
      expect(slug).toMatch(/-12345678$/u);
    },
  );

  it('keeps the name when adding a collision suffix without trailing hyphens', () => {
    expect(organisationSlugFor('Oran Makers', '12345678')).toBe(
      'oran-makers-12345678',
    );
    expect(organisationSlugFor(`${'a'.repeat(30)} Builders`, '12345678')).toBe(
      `${'a'.repeat(30)}-12345678`,
    );
  });
});
