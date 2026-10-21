import { describe, expect, it } from 'vitest';

import { atMigration, priorEventRow } from './migrations.fixtures.js';

describe('0046 — the event kind (real D1)', () => {
  it('files every existing event as a meetup, the one kind there was', async () => {
    const { event, apply } = await atMigration('0046_event_kind.sql');

    await apply();

    expect(await priorEventRow(event.id)).toMatchObject({
      id: event.id,
      kind: 'meetup',
      title: 'Prior schema event',
    });
  });
});
