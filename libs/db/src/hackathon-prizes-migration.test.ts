import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

describe('0060 — hackathon prizes (real D1)', () => {
  it('adds the table beside hackathons, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration('0060_hackathon_prizes.sql');

    await apply();

    expect(await columnNames('hackathon_prizes')).toEqual([
      'id',
      'event_id',
      'track_id',
      'place',
      'title',
      'description',
      'provider_name',
      'value_amount_minor',
      'value_currency',
      'confirmed_at',
      'confirmation_note',
      'created_at',
      'updated_at',
    ]);
    expect(await indexNames('hackathon_prizes')).toEqual(
      expect.arrayContaining([
        'hackathon_prizes_event_idx',
        'hackathon_prizes_track_idx',
      ]),
    );
    expect(await indexNames('hackathon_tracks')).toContain(
      'hackathon_tracks_event_unique',
    );
    expect(await priorEventRow(event.id)).toMatchObject({ id: event.id });
  });
});
