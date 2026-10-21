import { describe, expect, it } from 'vitest';

import type { UserProfile } from './api';
import {
  commandFrom,
  draftFrom,
  isDraftDirty,
  linkUrlOf,
  withLink,
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
        links: withLink([], 'website', 'http://insecure.example'),
      },
      3,
    );

    expect(built).toMatchObject({
      ok: false,
      field: 'links',
      linkKind: 'website',
    });
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

  it('gives each kind of link its own field, kept in the fields’ order', () => {
    const website = { kind: 'website', url: 'https://example.com' } as const;
    const links = withLink([website], 'github', 'https://github.com/amina');

    expect(links).toEqual([
      { kind: 'github', url: 'https://github.com/amina' },
      website,
    ]);
    expect(linkUrlOf(links, 'github')).toBe('https://github.com/amina');
    expect(linkUrlOf(links, 'linkedin')).toBe('');
    expect(withLink(links, 'github', '')).toEqual([website]);
    expect(withLink(links, 'website', 'https://example.org')).toEqual([
      { kind: 'github', url: 'https://github.com/amina' },
      { kind: 'website', url: 'https://example.org' },
    ]);
  });

  it('names the field whose address is not of its kind', () => {
    const built = commandFrom(
      {
        ...draftFrom(saved),
        links: withLink(
          withLink([], 'website', 'https://example.com'),
          'github',
          'https://www.linkedin.com/in/amina',
        ),
      },
      3,
    );

    expect(built).toMatchObject({
      ok: false,
      field: 'links',
      linkKind: 'github',
    });
  });

  it('calls a profile clean when its links were only stored in another order', () => {
    const github = { kind: 'github', url: 'https://github.com/amina' } as const;
    const website = { kind: 'website', url: 'https://example.com' } as const;
    const stored = { ...saved, links: [website, github] };

    expect(
      isDraftDirty(
        {
          ...draftFrom(stored),
          links: withLink(stored.links, 'github', github.url),
        },
        stored,
      ),
    ).toBe(false);
  });

  it('sends skills, links and open to with their publication', () => {
    const built = commandFrom(
      {
        ...draftFrom(saved),
        skills: ['backend', 'ai_ml'],
        links: withLink([], 'linkedin', 'https://dz.linkedin.com/in/amina'),
        openTo: ['co_founding'],
        visibility: {
          ...saved.visibility,
          skills: true,
          links: true,
          openTo: true,
        },
      },
      3,
    );

    expect(built).toMatchObject({
      ok: true,
      command: {
        skills: ['backend', 'ai_ml'],
        links: [{ kind: 'linkedin', url: 'https://dz.linkedin.com/in/amina' }],
        openTo: ['co_founding'],
        visibility: { skills: true, links: true, openTo: true },
      },
    });
  });
});
