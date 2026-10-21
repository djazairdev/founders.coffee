import { describe, expect, it } from 'vitest';

import {
  organisationApplicationSchema,
  organisationEditSchema,
  organisationSlugSchema,
} from './schemas.js';

const APPLICATION = {
  name: 'GDG Algiers',
  slug: 'gdg-algiers',
  kind: 'community',
  marketCode: 'DZ',
  description:
    'Google Developer Group in Algiers: monthly talks and study jams.',
};

describe('organisationSlugSchema', () => {
  it.each(['gdg-algiers', 'usthb', 'club-42', 'a1b'])('accepts %s', (slug) => {
    expect(organisationSlugSchema.parse(slug)).toBe(slug);
  });

  it('lowercases and trims what it is given', () => {
    expect(organisationSlugSchema.parse('  GDG-Algiers ')).toBe('gdg-algiers');
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(41)],
    ['a leading hyphen', '-gdg'],
    ['a trailing hyphen', 'gdg-'],
    ['a doubled hyphen', 'gdg--algiers'],
    ['a space', 'gdg algiers'],
    ['an underscore', 'gdg_algiers'],
    ['a non-Latin letter', 'جامعة'],
    ['an accent', 'école-42'],
    ['a reserved word', 'admin'],
    ['the platform’s own name', 'founders-coffee'],
  ])('refuses %s', (_case, slug) => {
    expect(organisationSlugSchema.safeParse(slug).success).toBe(false);
  });
});

describe('organisationApplicationSchema', () => {
  it('fills the optional city and website with null', () => {
    expect(organisationApplicationSchema.parse(APPLICATION)).toEqual({
      ...APPLICATION,
      cityCode: null,
      websiteUrl: null,
    });
  });

  it('keeps a credential-free https website and refuses anything else', () => {
    expect(
      organisationApplicationSchema.parse({
        ...APPLICATION,
        websiteUrl: 'https://gdg.community.dev/gdg-algiers/',
      }).websiteUrl,
    ).toBe('https://gdg.community.dev/gdg-algiers/');
    for (const websiteUrl of [
      'http://gdg.dev',
      'javascript:alert(1)',
      'https://user:pass@gdg.dev',
    ])
      expect(
        organisationApplicationSchema.safeParse({ ...APPLICATION, websiteUrl })
          .success,
      ).toBe(false);
  });

  it.each([
    ['an unknown kind', { kind: 'charity' }],
    ['a market that is not a code', { marketCode: 'Algeria' }],
    ['a one-letter name', { name: 'G' }],
    ['a description too short to review', { description: 'Tech club' }],
    ['a status, which only an admin sets', { status: 'approved' }],
  ])('refuses %s', (_case, change) => {
    expect(
      organisationApplicationSchema.safeParse({ ...APPLICATION, ...change })
        .success,
    ).toBe(false);
  });
});

describe('organisationEditSchema', () => {
  it('takes any one editable field', () => {
    expect(organisationEditSchema.parse({ name: 'GDG Alger' })).toEqual({
      name: 'GDG Alger',
    });
  });

  it('refuses an empty edit', () => {
    expect(organisationEditSchema.safeParse({}).success).toBe(false);
  });

  it.each([
    ['the slug, the page’s fixed address', { slug: 'gdg-alger' }],
    ['the kind, which the admin approved', { kind: 'company' }],
    ['the market, which scopes everything it does', { marketCode: 'EG' }],
    ['the status', { status: 'approved' }],
  ])('refuses %s', (_case, change) => {
    expect(
      organisationEditSchema.safeParse({ name: 'GDG Alger', ...change })
        .success,
    ).toBe(false);
  });
});
