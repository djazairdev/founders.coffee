import { describe, expect, it } from 'vitest';

import {
  atMigration,
  columnNames,
  indexNames,
  priorEventRow,
} from './migrations.fixtures.js';

describe('0057 — judging criteria (real D1)', () => {
  it('adds the table beside hackathons, leaving existing events as they were', async () => {
    const { apply, event } = await atMigration('0057_hackathon_criteria.sql');

    await apply();

    expect(await columnNames('hackathon_criteria')).toEqual([
      'id',
      'event_id',
      'name',
      'description',
      'weight',
      'scale',
      'position',
      'created_at',
      'updated_at',
    ]);
    expect(await indexNames('hackathon_criteria')).toContain(
      'hackathon_criteria_position_unique',
    );
    expect(await priorEventRow(event.id)).toMatchObject({ id: event.id });
  });
});
