import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

describe('0055 — hackathon details (real D1)', () => {
  it('adds the table beside events, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration('0055_hackathons.sql');

    await apply();

    expect(await columnNames('hackathons')).toEqual([
      'event_id',
      'rules',
      'minimum_age',
      'attendance_modes',
      'team_min',
      'team_max',
      'capacity',
      'registration_opens_at',
      'registration_closes_at',
      'submission_deadline_at',
      'judging_ends_at',
      'ai_policy',
      'ai_policy_note',
      'licence_note',
      'review_status',
      'review_note',
      'results_published_at',
      'created_at',
      'updated_at',
    ]);
    expect(await indexNames('hackathons')).toContain(
      'hackathons_review_status_index',
    );
    expect(await priorEventRow(event.id)).toMatchObject({
      id: event.id,
      title: 'Prior schema event',
    });
    expect(
      await env.PRIOR_DB.prepare('SELECT COUNT(*) AS n FROM hackathons').first(
        'n',
      ),
    ).toBe(0);
  });
});
