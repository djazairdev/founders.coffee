import { describe, expect, it } from 'vitest';

import { decideLeaveProject } from './leave.js';
import { projectEditSchema } from './schemas.js';

const edit = {
  projectId: 'prj_0123456789abcdef0123456789abcdef',
  expectedVersion: 2,
  stage: 'mvp',
};

describe('leaving a project (B-PRJ-04)', () => {
  it('lets a member leave while someone else stays', () => {
    expect(decideLeaveProject({ isOnProject: true, memberCount: 2 }).ok).toBe(
      true,
    );
  });

  it('refuses the last person on it, and reads as not found to anyone else', () => {
    const last = decideLeaveProject({ isOnProject: true, memberCount: 1 });
    const stranger = decideLeaveProject({ isOnProject: false, memberCount: 3 });

    expect(last.ok ? null : last.error.code).toBe('project_last_member');
    expect(stranger.ok ? null : stranger.error.code).toBe('project_not_found');
  });
});

describe('the edit schema (B-PRJ-04)', () => {
  it('fills what an edit leaves out with no links and no search listing', () => {
    expect(projectEditSchema.parse(edit)).toMatchObject({
      description: '',
      repositoryUrl: null,
      isSearchIndexable: false,
    });
  });

  it('takes only https links with no credentials', () => {
    for (const repositoryUrl of [
      'http://example.com',
      'https://user:pass@example.com',
      'javascript:alert(1)',
    ])
      expect(
        projectEditSchema.safeParse({ ...edit, repositoryUrl }).success,
      ).toBe(false);
    expect(
      projectEditSchema.safeParse({
        ...edit,
        repositoryUrl: 'https://github.com/team/ledger',
      }).success,
    ).toBe(true);
  });

  it('refuses a title, a problem or an unknown field, which an edit cannot change', () => {
    expect(projectEditSchema.safeParse({ ...edit, title: 'New' }).success).toBe(
      false,
    );
    expect(
      projectEditSchema.safeParse({ ...edit, status: 'published' }).success,
    ).toBe(false);
  });
});
