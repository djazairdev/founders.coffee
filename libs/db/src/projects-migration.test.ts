import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

describe('0064 — projects (real D1)', () => {
  it('adds projects and their members, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration('0064_projects.sql');

    await apply();

    expect(await columnNames('projects')).toEqual([
      'id',
      'slug',
      'title',
      'problem',
      'description',
      'stage',
      'repository_url',
      'demo_url',
      'website_url',
      'market_code',
      'source_submission_id',
      'status',
      'search_indexable',
      'version',
      'created_at',
      'updated_at',
    ]);
    expect(await columnNames('project_members')).toEqual([
      'project_id',
      'user_id',
      'role',
      'listed',
      'created_at',
    ]);
    expect(await indexNames('projects')).toEqual(
      expect.arrayContaining([
        'projects_slug_unique',
        'projects_source_submission_unique',
        'projects_market_status_index',
      ]),
    );
    expect(await indexNames('project_members')).toEqual(
      expect.arrayContaining(['project_members_user_index']),
    );
    expect(await priorEventRow(event.id)).toMatchObject({ id: event.id });
  });
});
