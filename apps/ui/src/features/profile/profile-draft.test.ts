import { describe, expect, it } from 'vitest';

import type { UserProfile } from './api';
import {
  commandFrom,
  draftFrom,
  firstLinkUrl,
  isDraftDirty,
  withFirstLink,
} from './profile-draft';

const saved: UserProfile = {
  userId: 'usr_1',
  displayName: 'Amina',
  revision: 3,
  photoAssetId: null,
  memberSince: '2026-03',
  headline: null,
  stage: null,
  introduction: null,
  interests: [],
  spokenLanguages: [],
  skills: [],
  links: [],
  openTo: [],
  visibility: {
    headline: false,
    stage: false,
    interests: false,
    spokenLanguages: false,
    skills: false,
    links: false,
    openTo: false,
    attendedCount: false,
  },
};

describe('profile draft', () => {
  it('starts clean and detects a change in any field', () => {
    const draft = draftFrom(saved);
    expect(isDraftDirty(draft, saved)).toBe(false);

    expect(
      isDraftDirty(
        {
          ...draft,
          links: [{ kind: 'website', url: 'https://example.com' }],
        },
        saved,
      ),
    ).toBe(true);
    expect(isDraftDirty({ ...draft, skills: ['frontend'] }, saved)).toBe(true);
    expect(isDraftDirty({ ...draft, openTo: ['jobs'] }, saved)).toBe(true);
    expect(isDraftDirty({ ...draft, interests: ['product'] }, saved)).toBe(
      true,
    );
    expect(isDraftDirty({ ...draft, spokenLanguages: ['ar'] }, saved)).toBe(
      true,
    );
    expect(
      isDraftDirty(
        { ...draft, visibility: { ...draft.visibility, interests: true } },
        saved,
      ),
    ).toBe(true);
    expect(isDraftDirty({ ...draft, headline: 'A shop app' }, saved)).toBe(
      true,
    );
    expect(isDraftDirty({ ...draft, stage: 'idea' }, saved)).toBe(true);
    expect(
      isDraftDirty(
        { ...draft, visibility: { ...draft.visibility, stage: true } },
        saved,
      ),
    ).toBe(true);
  });

  it('does not call a rebuilt but identical array dirty', () => {
    const withTopics: UserProfile = { ...saved, interests: ['product'] };
    expect(isDraftDirty(draftFrom(withTopics), withTopics)).toBe(false);
  });

  it('accepts the introduction without inventing its language', () => {
    const built = commandFrom(
      { ...draftFrom(saved), introduction: 'Building small tools.' },
      3,
    );

    expect(built.ok && built.command.introduction).toBe(
      'Building small tools.',
    );
    expect(built.ok && built.command).not.toHaveProperty('introductionLocale');
  });

  it('reports the field that stops a save rather than a generic failure', () => {
    const built = commandFrom(
      {
        ...draftFrom(saved),
        links: withFirstLink([], 'http://insecure.example'),
      },
      3,
    );

    expect(built).toMatchObject({ ok: false, field: 'links' });
  });

  it('withdraws a publication whose field is emptied', () => {
    const built = commandFrom(
      {
        ...draftFrom(saved),
        skills: [],
        links: [],
        openTo: [],
        visibility: { ...saved.visibility, links: true },
      },
      3,
    );

    expect(built.ok && built.command.visibility.links).toBe(false);
  });

  it('sends what a member is building and its stage, withdrawing a publication left empty', () => {
    const built = commandFrom(
      {
        ...draftFrom(saved),
        headline: '  A bookkeeping app  ',
        stage: null,
        visibility: { ...saved.visibility, headline: true, stage: true },
      },
      3,
    );

    expect(built.ok && built.command).toMatchObject({
      headline: 'A bookkeeping app',
      stage: null,
      visibility: { headline: true, stage: false },
    });
  });

  it('edits the first link from the single link field, reading its kind from the address', () => {
    const website = { kind: 'website', url: 'https://example.com' } as const;
    const links = withFirstLink([website], 'https://www.github.com/amina');

    expect(links).toEqual([
      { kind: 'github', url: 'https://www.github.com/amina' },
    ]);
    expect(firstLinkUrl({ ...draftFrom(saved), links })).toBe(
      'https://www.github.com/amina',
    );
    expect(withFirstLink(links, 'https://dz.linkedin.com/in/amina')).toEqual([
      { kind: 'linkedin', url: 'https://dz.linkedin.com/in/amina' },
    ]);
    expect(withFirstLink(links, '')).toEqual([]);
    expect(firstLinkUrl(draftFrom(saved))).toBe('');
  });

  it('keeps the links after the first when the field changes', () => {
    const github = { kind: 'github', url: 'https://github.com/amina' } as const;
    const linkedin = {
      kind: 'linkedin',
      url: 'https://linkedin.com/in/amina',
    } as const;

    expect(withFirstLink([github, linkedin], 'https://example.com')).toEqual([
      { kind: 'website', url: 'https://example.com' },
      linkedin,
    ]);
    expect(withFirstLink([github, linkedin], '')).toEqual([linkedin]);
  });
});
