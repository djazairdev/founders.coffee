import { describe, expect, it } from 'vitest';

import { atMigration, priorEventRow } from './migrations.fixtures.js';

describe('0054 — event topics (real D1)', () => {
  it('gives every existing event no topics, with its other fields intact', async () => {
    const { event, apply } = await atMigration('0054_event_tags.sql');

    await apply();

    expect(await priorEventRow(event.id)).toMatchObject({
      id: event.id,
      kind: 'meetup',
      tags: '[]',
      title: 'Prior schema event',
    });
  });
});
