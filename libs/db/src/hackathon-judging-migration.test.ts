import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

describe('0063 — hackathon judging (real D1)', () => {
  it('adds judges, recusals and scores, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration('0063_hackathon_judging.sql');

    await apply();

    expect(await columnNames('hackathon_judges')).toEqual([
      'id',
      'event_id',
      'user_id',
      'status',
      'token_hash',
      'invited_by',
      'responded_at',
      'created_at',
      'updated_at',
    ]);
    expect(await columnNames('hackathon_recusals')).toEqual([
      'judge_id',
      'submission_id',
      'event_id',
      'reason',
      'created_at',
    ]);
    expect(await columnNames('hackathon_scores')).toEqual([
      'submission_id',
      'judge_id',
      'criterion_id',
      'event_id',
      'value',
      'comment',
      'created_at',
      'updated_at',
    ]);
    expect(await indexNames('hackathon_criteria')).toEqual(
      expect.arrayContaining(['hackathon_criteria_event_unique']),
    );
    expect(await indexNames('hackathon_submissions')).toEqual(
      expect.arrayContaining(['hackathon_submissions_event_unique']),
    );
    expect(await indexNames('hackathon_judges')).toEqual(
      expect.arrayContaining([
        'hackathon_judges_token_hash_unique',
        'hackathon_judges_event_unique',
        'hackathon_judges_user_unique',
        'hackathon_judges_user_index',
      ]),
    );
    expect(await priorEventRow(event.id)).toMatchObject({ id: event.id });
  });
});
