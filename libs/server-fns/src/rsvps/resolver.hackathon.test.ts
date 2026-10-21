import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  eventRsvps,
  events,
  getEvent,
  scheduledNotifications,
  type Db,
} from '@founders-coffee/db';

import { createRsvpResolver } from './resolver.js';
import { members, seedEvent, setupDb } from './resolver.fixtures.js';

const makeKind = (db: Db, eventId: string, kind: 'workshop' | 'hackathon') =>
  db.update(events).set({ kind }).where(eq(events.id, eventId)).run();

describe('RSVP to a hackathon (real D1)', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
  });

  it('refuses it with a typed error and writes nothing', async () => {
    const eventId = await seedEvent(db);
    await makeKind(db, eventId, 'hackathon');

    const result = await createRsvpResolver(db, {
      eventId,
      userId: members[0].id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe('hackathon_requires_registration');
    expect(
      await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, eventId)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(scheduledNotifications)
        .where(eq(scheduledNotifications.eventId, eventId)),
    ).toEqual([]);
    expect((await getEvent(db, eventId))?.rsvps).toBe(0);
  });

  it('still takes an RSVP to a meetup or a workshop', async () => {
    const meetup = await seedEvent(db);
    const workshop = await seedEvent(db);
    await makeKind(db, workshop, 'workshop');

    for (const eventId of [meetup, workshop])
      expect(
        await createRsvpResolver(db, { eventId, userId: members[1].id }),
      ).toEqual({ ok: true, data: { status: 'going' } });
  });
});
