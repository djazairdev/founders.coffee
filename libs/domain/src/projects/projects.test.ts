import { describe, expect, it } from 'vitest';

import { projectSchema, projectSlugSchema } from './schemas.js';
import { decideProjectStatus, isProjectIndexable } from './status.js';

const project = {
  title: 'Ledger for corner shops',
  problem: 'Corner shops in Algiers keep their credit book on paper.',
  stage: 'prototype',
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

describe('projects (B-PRJ-01)', () => {
  it('takes a project with a problem and a stage, and no link or index by default', () => {
    expect(projectSchema.parse(project)).toEqual({
      ...project,
      description: '',
      repositoryUrl: null,
      demoUrl: null,
      websiteUrl: null,
      isSearchIndexable: false,
    });
  });

  it('refuses a stage it does not know, a short problem and a link that is not HTTPS', () => {
    const takes = (values: object) =>
      projectSchema.safeParse({ ...project, ...values }).success;
    expect(takes({ stage: 'scaling' })).toBe(false);
    expect(takes({ problem: 'Too short' })).toBe(false);
    expect(takes({ repositoryUrl: 'http://github.com/byte-club/ledger' })).toBe(
      false,
    );
    expect(takes({ websiteUrl: 'https://user:secret@ledger.example' })).toBe(
      false,
    );
    expect(takes({ demoUrl: 'https://ledger.example/demo' })).toBe(true);
  });

  it('takes a slug of lowercase words joined by single hyphens', () => {
    const takes = (slug: string) => projectSlugSchema.safeParse(slug).success;
    expect(takes('ledger-for-corner-shops')).toBe(true);
    expect(takes('ledger--shops')).toBe(false);
    expect(takes('Ledger')).toBe(false);
    expect(takes('-ledger')).toBe(false);
    expect(takes('ab')).toBe(false);
  });

  it('publishes a draft once, then hides and shows it, never back to a draft', () => {
    expect(codeOf(decideProjectStatus('draft', 'published'))).toBeNull();
    expect(codeOf(decideProjectStatus('published', 'hidden'))).toBeNull();
    expect(codeOf(decideProjectStatus('hidden', 'published'))).toBeNull();
    expect(codeOf(decideProjectStatus('published', 'draft'))).toBe(
      'invalid_project_transition',
    );
    expect(codeOf(decideProjectStatus('draft', 'hidden'))).toBe(
      'invalid_project_transition',
    );
  });

  it('lets search engines index only a published project whose team turned it on', () => {
    expect(
      isProjectIndexable({ status: 'published', isSearchIndexable: true }),
    ).toBe(true);
    expect(
      isProjectIndexable({ status: 'hidden', isSearchIndexable: true }),
    ).toBe(false);
    expect(
      isProjectIndexable({ status: 'published', isSearchIndexable: false }),
    ).toBe(false);
  });
});
