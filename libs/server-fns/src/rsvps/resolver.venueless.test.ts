import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  eventRsvps,
  events,
  getEvent,
  scheduledNotifications,
  type Db,
} from '@founders-coffee/db';

import { cancelEventResolver } from '../events/cancel.js';
import { announceUpdate } from '../events/update-notices.js';
import { cancelRsvpResolver, createRsvpResolver } from './resolver.js';
import { HOST_ID, members, seedEvent, setupDb } from './resolver.fixtures.js';

const noticesFor = (db: Db, eventId: string) =>
  db
    .select({
      templateKey: scheduledNotifications.templateKey,
      status: scheduledNotifications.status,
    })
    .from(scheduledNotifications)
    .where(eq(scheduledNotifications.eventId, eventId));

const goOnline = (db: Db, eventId: string) =>
  db
    .update(events)
    .set({
      venue: null,
      format: 'online',
      meetingUrl: 'https://meet.example/founders',
    })
    .where(eq(events.id, eventId))
    .run();

describe('an event with no venue sends nothing that names one (real D1)', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
  });

  it('takes an RSVP without queueing a confirmation, reminder or host notice', async () => {
    const eventId = await seedEvent(db);
    await goOnline(db, eventId);

    const result = await createRsvpResolver(db, {
      eventId,
      userId: members[0].id,
    });

    expect(result).toEqual({ ok: true, data: { status: 'going' } });
    expect(
      await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, eventId)),
    ).toHaveLength(1);
    expect(await noticesFor(db, eventId)).toEqual([]);

    expect(
      await cancelRsvpResolver(db, { eventId, userId: members[0].id }),
    ).toEqual({ ok: true, data: { deleted: true } });
    expect(await noticesFor(db, eventId)).toEqual([]);
  });

  it('cancels the event and tells nobody in words about a place', async () => {
    const eventId = await seedEvent(db);
    await goOnline(db, eventId);
    await createRsvpResolver(db, { eventId, userId: members[1].id });

    const result = await cancelEventResolver(db, {
      eventId,
      actorId: HOST_ID,
    });

    expect(result.ok && result.data.notified).toBe(0);
    expect((await getEvent(db, eventId))?.status).toBe('cancelled');
    expect(await noticesFor(db, eventId)).toEqual([]);
  });

  it('withdraws the reminders of an event that loses its venue, and writes none again', async () => {
    const eventId = await seedEvent(db);
    await createRsvpResolver(db, { eventId, userId: members[2].id });
    const before = await getEvent(db, eventId);
    expect(
      (await noticesFor(db, eventId)).filter(
        (notice) =>
          notice.templateKey === 'reminder_24h' && notice.status === 'pending',
      ),
    ).not.toEqual([]);
    await goOnline(db, eventId);
    const after = await getEvent(db, eventId);
    if (!before || !after) throw new Error('the event is missing');

    expect(
      await announceUpdate(db, {
        before,
        after: { ...after, startsAt: new Date('2099-01-16T18:00:00Z') },
        notice: 'event_rescheduled',
      }),
    ).toBe(0);

    const reminders = (await noticesFor(db, eventId)).filter((notice) =>
      ['reminder_72h', 'reminder_24h'].includes(notice.templateKey),
    );
    expect(reminders).not.toEqual([]);
    expect(reminders.every((notice) => notice.status === 'cancelled')).toBe(
      true,
    );
    expect(
      (await noticesFor(db, eventId)).filter(
        (notice) => notice.templateKey === 'event_rescheduled',
      ),
    ).toEqual([]);
  });
});
