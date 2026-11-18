import { describe, expect, it } from 'vitest';

import { profile_meta_description } from '@founders-coffee/i18n';

import { INDEX_VALUE, NO_INDEX_VALUE } from './indexation';
import { profilePageHead, profileRobots } from './seo-profile';

const profile = {
  userId: 'usr_1',
  displayName: 'Amina',
  headline: null,
  introduction: null,
  links: [],
  indexable: true,
};

const descriptionOf = (head: ReturnType<typeof profilePageHead>) =>
  head.meta.find((tag) => 'name' in tag && tag.name === 'description');

const personOf = (head: ReturnType<typeof profilePageHead>) => {
  const script = 'scripts' in head ? head.scripts[0] : undefined;
  return script
    ? (JSON.parse(script.children) as { mainEntity: Record<string, unknown> })
        .mainEntity
    : null;
};

describe('the head of a profile page (B-PRF-04)', () => {
  it('answers noindex until the member turns the switch on, and while the page has no profile', () => {
    expect(profileRobots(undefined)).toBe(NO_INDEX_VALUE);
    expect(profileRobots({ ...profile, indexable: false })).toBe(
      NO_INDEX_VALUE,
    );
    expect(profileRobots(profile)).toBe(INDEX_VALUE);
  });

  it('gives an unlisted profile its title and noindex, and nothing a crawler could follow', () => {
    const head = profilePageHead('en', 'Your profile', {
      ...profile,
      indexable: false,
    });

    expect(head).toEqual({
      meta: [
        { title: 'Founders Coffee - Amina' },
        { name: 'robots', content: NO_INDEX_VALUE },
      ],
    });
    expect(profilePageHead('en', 'Your profile', undefined).meta[0]).toEqual({
      title: 'Founders Coffee - Your profile',
    });
  });

  it('describes a listed profile by its published headline, else its introduction, else its name', () => {
    expect(
      descriptionOf(
        profilePageHead('fr', 'Votre profil', {
          ...profile,
          headline: 'Building a bookkeeping app',
          introduction: 'Hello',
        }),
      ),
    ).toMatchObject({ content: 'Building a bookkeeping app' });
    expect(
      descriptionOf(
        profilePageHead('fr', 'Votre profil', {
          ...profile,
          introduction: 'Hello',
        }),
      ),
    ).toMatchObject({ content: 'Hello' });
    expect(
      descriptionOf(profilePageHead('ar', 'ملفك الشخصي', profile)),
    ).toMatchObject({
      content: profile_meta_description({ name: 'Amina' }, { locale: 'ar' }),
    });
  });

  it('names the published links in sameAs, and leaves it out when there are none', () => {
    expect(personOf(profilePageHead('en', 'Your profile', profile))).toEqual({
      '@type': 'Person',
      name: 'Amina',
      url: expect.stringMatching(/\/en\/u\/usr_1$/u),
    });
    expect(
      personOf(
        profilePageHead('en', 'Your profile', {
          ...profile,
          headline: 'Builder',
          links: [{ url: 'https://github.com/amina' }],
        }),
      ),
    ).toMatchObject({
      description: 'Builder',
      sameAs: ['https://github.com/amina'],
    });
  });

  it('keeps text a member wrote inside the JSON-LD script, however it ends', () => {
    const name = 'Amina</script><meta http-equiv=refresh content=0>';
    const head = profilePageHead('en', 'Your profile', {
      ...profile,
      displayName: name,
      headline: '<!-- builder',
    });
    const text = 'scripts' in head ? head.scripts[0].children : '';

    expect(text).not.toContain('<');
    expect(personOf(head)).toMatchObject({ name, description: '<!-- builder' });
  });
});
