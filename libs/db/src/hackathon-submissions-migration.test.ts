import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

describe('0062 — hackathon submissions (real D1)', () => {
  it('adds submissions and their snapshots, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration(
      '0062_hackathon_submissions.sql',
    );

    await apply();

    expect(await columnNames('hackathon_submissions')).toEqual([
      'id',
      'event_id',
      'team_id',
      'track_id',
      'title',
      'description',
      'repository_url',
      'demo_video_url',
      'pull_request_urls',
      'ai_tools',
      'ai_statement',
      'original_work_attested_at',
      'status',
      'submitted_at',
      'version',
      'created_at',
      'updated_at',
    ]);
    expect(await columnNames('hackathon_submission_versions')).toEqual([
      'submission_id',
      'version',
      'track_id',
      'title',
      'description',
      'repository_url',
      'demo_video_url',
      'pull_request_urls',
      'ai_tools',
      'ai_statement',
      'original_work_attested_at',
      'submitted_at',
      'submitted_by',
    ]);
    expect(await indexNames('hackathon_submissions')).toEqual(
      expect.arrayContaining([
        'hackathon_submissions_team_unique',
        'hackathon_submissions_event_status_index',
        'hackathon_submissions_track_index',
      ]),
    );
    expect(await priorEventRow(event.id)).toMatchObject({ id: event.id });
  });
});
