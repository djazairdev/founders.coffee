import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

describe('0056 — hackathon tracks (real D1)', () => {
  it('adds the table beside hackathons, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration('0056_hackathon_tracks.sql');

    await apply();

    expect(await columnNames('hackathon_tracks')).toEqual([
      'id',
      'event_id',
      'kind',
      'title',
      'brief',
      'partner_name',
      'source_urls',
      'position',
      'created_at',
      'updated_at',
    ]);
    expect(await indexNames('hackathon_tracks')).toContain(
      'hackathon_tracks_position_unique',
    );
    expect(await priorEventRow(event.id)).toMatchObject({ id: event.id });
  });
});
