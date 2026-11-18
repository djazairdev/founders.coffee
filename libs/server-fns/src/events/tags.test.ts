import { describe, expect, it } from 'vitest';

import { getEvent } from '@founders-coffee/db';

import { createEventResolver } from './create-resolver.js';
import {
  createInput,
  setupDb,
  testMapProvider,
  TEST_HOST_ID,
} from './resolver.fixtures.js';
import { apply, hostAnEvent } from './update.fixtures.js';

describe('the topics of an event (real D1, B-EVT-06)', () => {
  it('stores the topics a host names, and none when they name none', async () => {
    const db = await setupDb();

    const tagged = await createEventResolver(
      db,
      testMapProvider,
      TEST_HOST_ID,
      createInput({ tags: ['product', 'design'] }),
    );
    const plain = await createEventResolver(
      db,
      testMapProvider,
      TEST_HOST_ID,
      createInput({ title: 'An untagged meetup' }),
    );

    expect(tagged.ok && plain.ok).toBe(true);
    if (tagged.ok)
      expect((await getEvent(db, tagged.data.id))?.tags).toEqual([
        'product',
        'design',
      ]);
    if (plain.ok) expect((await getEvent(db, plain.data.id))?.tags).toEqual([]);
  });

  it('lets a host change the topics, and keeps them when an edit leaves them out', async () => {
    const db = await setupDb();
    const event = await hostAnEvent(db);

    expect((await apply(db, event, { tags: ['community'] })).ok).toBe(true);
    const tagged = await getEvent(db, event.id);
    expect(tagged?.tags).toEqual(['community']);

    if (!tagged) return;
    expect((await apply(db, tagged, { title: 'Renamed meetup' })).ok).toBe(
      true,
    );
    const renamed = await getEvent(db, event.id);
    expect(renamed?.tags).toEqual(['community']);

    if (!renamed) return;
    expect((await apply(db, renamed, { tags: [] })).ok).toBe(true);
    expect((await getEvent(db, event.id))?.tags).toEqual([]);
  });
});
