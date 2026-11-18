import { describe, expect, it } from 'vitest';

import {
  decideProjectFromEntry,
  decidePublishProject,
  hasProjectConfirmation,
  projectFromEntry,
  projectSlugFor,
} from './from-entry.js';
import { projectSlugSchema } from './schemas.js';

const codeOf = (result: { ok: boolean; error?: { code?: string } }) =>
  result.ok ? null : result.error?.code;

const owner = { role: 'owner' as const, isListed: true };
const teammate = { role: 'member' as const, isListed: false };

describe('projectSlugFor', () => {
  it('reads from the title and always stays a valid slug', () => {
    expect(projectSlugFor('Ledger for Corner Shops!', 'ab12')).toBe(
      'ledger-for-corner-shops-ab12',
    );
    expect(projectSlugFor('دفتر', 'ab12')).toBe('project-ab12');
    const long = projectSlugFor(`${'word '.repeat(40)}`, 'ab12cd34');
    expect(long.length).toBeLessThanOrEqual(80);
    for (const slug of [long, projectSlugFor('--a--', 'ab12')])
      expect(projectSlugSchema.safeParse(slug).success).toBe(true);
  });
});

describe('projectFromEntry', () => {
  const ENTRY = {
    title: 'Ledger',
    description: 'A ledger on a phone.',
    brief: 'Help a corner shop take payments.',
    repositoryUrl: 'https://github.com/byte-club/ledger',
    demoVideoUrl: null,
  };

  it('copies the entry and starts from its track’s brief', () => {
    expect(projectFromEntry(ENTRY)).toEqual({
      title: 'Ledger',
      problem: 'Help a corner shop take payments.',
      description: 'A ledger on a phone.',
      stage: 'prototype',
      repositoryUrl: 'https://github.com/byte-club/ledger',
      demoUrl: null,
    });
  });

  it('falls back on the description and keeps the problem within its limit', () => {
    expect(projectFromEntry({ ...ENTRY, brief: null }).problem).toBe(
      'A ledger on a phone.',
    );
    expect(
      projectFromEntry({ ...ENTRY, brief: 'x'.repeat(900) }).problem,
    ).toHaveLength(500);
  });
});

describe('decideProjectFromEntry', () => {
  const ALLOWED = {
    isResultsPublished: true,
    isCaptain: true,
    entryStatus: 'submitted' as const,
    hasProject: false,
  };

  it('lets a captain make one after the results', () => {
    expect(decideProjectFromEntry(ALLOWED).ok).toBe(true);
  });

  it('refuses anyone else, before the results, a disqualified entry and a second one', () => {
    expect(
      codeOf(decideProjectFromEntry({ ...ALLOWED, isCaptain: false })),
    ).toBe('not_team_captain');
    expect(
      codeOf(decideProjectFromEntry({ ...ALLOWED, isResultsPublished: false })),
    ).toBe('project_not_available');
    expect(
      codeOf(
        decideProjectFromEntry({ ...ALLOWED, entryStatus: 'disqualified' }),
      ),
    ).toBe('project_not_available');
    expect(
      codeOf(decideProjectFromEntry({ ...ALLOWED, entryStatus: null })),
    ).toBe('project_not_available');
    expect(
      codeOf(decideProjectFromEntry({ ...ALLOWED, hasProject: true })),
    ).toBe('project_exists');
  });
});

describe('publishing a project', () => {
  const ALLOWED = {
    status: 'draft' as const,
    isOwner: true,
    isEntryDisqualified: false,
    members: [owner, { ...teammate, isListed: true }],
  };

  it('needs one teammate to confirm, unless the team is one person', () => {
    expect(hasProjectConfirmation([owner])).toBe(true);
    expect(hasProjectConfirmation([owner, teammate])).toBe(false);
    expect(
      hasProjectConfirmation([
        owner,
        teammate,
        { ...teammate, isListed: true },
      ]),
    ).toBe(true);
  });

  it('lets only the owner publish a draft from an entry still standing', () => {
    expect(decidePublishProject(ALLOWED).ok).toBe(true);
    expect(codeOf(decidePublishProject({ ...ALLOWED, isOwner: false }))).toBe(
      'not_project_owner',
    );
    expect(
      codeOf(decidePublishProject({ ...ALLOWED, isEntryDisqualified: true })),
    ).toBe('project_not_available');
    expect(codeOf(decidePublishProject({ ...ALLOWED, status: 'hidden' }))).toBe(
      'invalid_project_transition',
    );
    expect(
      codeOf(decidePublishProject({ ...ALLOWED, members: [owner, teammate] })),
    ).toBe('project_needs_confirmation');
  });
});
