import { describe, expect, it } from 'vitest';

import { PROFILE_SKILLS } from '@founders-coffee/core';

import {
  linkKindOf,
  PROFILE_LINK_LIMIT,
  PROFILE_SKILL_LIMIT,
  profileDetailsSchema,
  profileLinkSchema,
  profileLinksSchema,
  profileOpenToListSchema,
  profileSkillsSchema,
  updateProfileSchema,
} from './schemas.js';

const minimal = {
  displayName: 'Amina',
  expectedRevision: 0,
  headline: null,
  stage: null,
  introduction: null,
};

describe('portfolio link kinds', () => {
  it('reads GitHub and LinkedIn from the host, and anything else as a website', () => {
    expect(linkKindOf('https://github.com/amina')).toBe('github');
    expect(linkKindOf('https://WWW.GitHub.com/amina')).toBe('github');
    expect(linkKindOf('https://linkedin.com/in/amina')).toBe('linkedin');
    expect(linkKindOf('https://dz.linkedin.com/in/amina')).toBe('linkedin');
    expect(linkKindOf('https://gist.github.com/amina')).toBe('website');
    expect(linkKindOf('https://github.com.example.dz/amina')).toBe('website');
    expect(linkKindOf('https://notlinkedin.com/in/amina')).toBe('website');
    expect(linkKindOf('https://amina.dz')).toBe('website');
  });

  it('reads an address that cannot be parsed as a website rather than throwing', () => {
    expect(linkKindOf('not a url')).toBe('website');
    expect(linkKindOf('')).toBe('website');
  });
});

describe('portfolio link schema', () => {
  it('accepts a credential-free HTTPS address of the kind it claims', () => {
    expect(
      profileLinkSchema.parse({
        kind: 'github',
        url: '  https://github.com/amina  ',
      }),
    ).toEqual({ kind: 'github', url: 'https://github.com/amina' });
  });

  it('refuses plain HTTP, credentials and a kind that does not match the address', () => {
    for (const link of [
      { kind: 'website', url: 'http://amina.dz' },
      { kind: 'website', url: 'https://user:secret@amina.dz' },
      { kind: 'website', url: 'javascript:alert(1)' },
      { kind: 'github', url: 'https://amina.dz' },
      { kind: 'website', url: 'https://github.com/amina' },
      { kind: 'linkedin', url: 'https://github.com/amina' },
    ]) {
      expect(profileLinkSchema.safeParse(link).success).toBe(false);
    }
  });

  it('refuses an address over 2048 characters', () => {
    const url = `https://amina.dz/${'a'.repeat(2048)}`;
    expect(profileLinkSchema.safeParse({ kind: 'website', url }).success).toBe(
      false,
    );
  });

  it('takes up to three links, one of each kind', () => {
    const links = [
      { kind: 'github', url: 'https://github.com/amina' },
      { kind: 'linkedin', url: 'https://linkedin.com/in/amina' },
      { kind: 'website', url: 'https://amina.dz' },
    ];
    expect(PROFILE_LINK_LIMIT).toBe(3);
    expect(profileLinksSchema.parse(links)).toEqual(links);
    expect(
      profileLinksSchema.safeParse([
        { kind: 'website', url: 'https://amina.dz' },
        { kind: 'website', url: 'https://example.com' },
      ]).success,
    ).toBe(false);
  });
});

describe('portfolio skills and open to', () => {
  it('takes up to ten skills from the fixed list, each once', () => {
    const ten = PROFILE_SKILLS.slice(0, PROFILE_SKILL_LIMIT);
    expect(PROFILE_SKILL_LIMIT).toBe(10);
    expect(profileSkillsSchema.parse(ten)).toEqual(ten);
    expect(
      profileSkillsSchema.safeParse(PROFILE_SKILLS.slice(0, 11)).success,
    ).toBe(false);
    expect(
      profileSkillsSchema.safeParse(['frontend', 'frontend']).success,
    ).toBe(false);
    expect(profileSkillsSchema.safeParse(['juggling']).success).toBe(false);
  });

  it('takes any of jobs, internships and co-founding, each once', () => {
    expect(
      profileOpenToListSchema.parse(['jobs', 'internships', 'co_founding']),
    ).toEqual(['jobs', 'internships', 'co_founding']);
    expect(profileOpenToListSchema.safeParse(['jobs', 'jobs']).success).toBe(
      false,
    );
    expect(profileOpenToListSchema.safeParse(['freelance']).success).toBe(
      false,
    );
  });
});

describe('portfolio fields on the profile', () => {
  it('start empty and unpublished', () => {
    expect(profileDetailsSchema.parse({})).toMatchObject({
      skills: [],
      links: [],
      openTo: [],
      visibility: { skills: false, links: false, openTo: false },
    });
  });

  it('stay unpublished while empty, even when the member turned publishing on', () => {
    const value = updateProfileSchema.parse({
      ...minimal,
      skills: [],
      links: [],
      openTo: ['jobs'],
      visibility: { skills: true, links: true, openTo: true },
    });
    expect(value.visibility).toMatchObject({
      skills: false,
      links: false,
      openTo: true,
    });
  });
});
