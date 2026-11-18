import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  events,
  getEvent,
  scheduledNotifications,
  type Db,
} from '@founders-coffee/db';
import { ntf_where_online, type Locale } from '@founders-coffee/i18n';

import { cancelEventResolver } from '../events/cancel.js';
import { announceUpdate } from '../events/update-notices.js';
import { cancelRsvpResolver, createRsvpResolver } from './resolver.js';
import { HOST_ID, members, seedEvent, setupDb } from './resolver.fixtures.js';

const LINK = 'https://meet.example.com/founders';
const MOVED = 'https://call.example.org/founders';
const VENUE = 'Café des Délices, Hydra';

type Payload = {
  readonly locale: Locale;
  readonly subject?: string;
  readonly html?: string;
  readonly text?: string;
  readonly pushTitle?: string;
  readonly pushBody?: string;
};

const noticesFor = async (db: Db, eventId: string) =>
  (
    await db
      .select({
        templateKey: scheduledNotifications.templateKey,
        status: scheduledNotifications.status,
        payload: scheduledNotifications.payload,
      })
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.eventId, eventId))
  ).map((row) => ({
    ...row,
    payload: (typeof row.payload === 'string'
      ? JSON.parse(row.payload)
      : row.payload) as Payload,
  }));

const pending = async (db: Db, eventId: string, templateKey: string) =>
  (await noticesFor(db, eventId)).filter(
    (notice) =>
      notice.templateKey === templateKey && notice.status === 'pending',
  );

const goOnline = (db: Db, eventId: string) =>
  db
    .update(events)
    .set({
      venue: null,
      venueAddress: null,
      latitude: null,
      longitude: null,
      format: 'online',
      meetingUrl: LINK,
    })
    .where(eq(events.id, eventId))
    .run();

const online = (payload: Payload) =>
  ntf_where_online({}, { locale: payload.locale });

describe('notifications for an online event (real D1, B-EVT-13)', () => {
  let db: Db;
  let eventId: string;

  beforeEach(async () => {
    db = await setupDb();
    eventId = await seedEvent(db);
    await goOnline(db, eventId);
  });

  it('confirms an RSVP and queues both reminders with the member’s link, saying online', async () => {
    await createRsvpResolver(db, { eventId, userId: members[0].id });

    for (const key of ['rsvp_confirmation', 'reminder_72h', 'reminder_24h']) {
      const [notice] = await pending(db, eventId, key);
      if (!notice) throw new Error(`no pending ${key}`);
      expect(notice.payload.html).toContain(`href="${LINK}"`);
      expect(notice.payload.text).toContain(LINK);
      expect(
        `${notice.payload.subject} ${notice.payload.pushTitle} ${notice.payload.pushBody}`,
        'a subject is logged by the email provider and a push shows on a locked phone',
      ).not.toContain(LINK);
      expect(notice.payload.text).not.toContain(VENUE);
    }
    const [confirmation] = await pending(db, eventId, 'rsvp_confirmation');
    expect(confirmation?.payload.text).toContain(online(confirmation.payload));
  });

  it('tells the host who is coming and who is not, saying online', async () => {
    await createRsvpResolver(db, { eventId, userId: members[0].id });
    await cancelRsvpResolver(db, { eventId, userId: members[0].id });

    const notices = await noticesFor(db, eventId);
    const received = notices.find(
      (notice) => notice.templateKey === 'rsvp_received',
    );
    const cancelled = notices.find(
      (notice) => notice.templateKey === 'rsvp_cancelled',
    );
    expect(received?.payload.text).toContain(online(received.payload));
    expect(cancelled?.payload.text).toContain(online(cancelled.payload));
    for (const notice of [received, cancelled])
      expect(
        notice?.payload.text,
        'the host has the link on the page; a notice about a guest does not need it',
      ).not.toContain(LINK);
  });

  it('tells the members going it is cancelled, without sending them anywhere', async () => {
    await createRsvpResolver(db, { eventId, userId: members[1].id });

    const result = await cancelEventResolver(db, {
      eventId,
      actorId: HOST_ID,
    });

    expect(result.ok && result.data.notified).toBe(1);
    const [notice] = await pending(db, eventId, 'event_cancelled');
    expect(notice?.payload.text).toContain(online(notice.payload));
    expect(notice?.payload.text).not.toContain(VENUE);
  });

  it('tells them of a new time, and writes the reminders again with the link', async () => {
    await createRsvpResolver(db, { eventId, userId: members[2].id });
    const before = await getEvent(db, eventId);
    if (!before) throw new Error('the event is missing');

    const notified = await announceUpdate(db, {
      before,
      after: { ...before, startsAt: new Date('2099-01-16T18:00:00Z') },
      notice: 'event_rescheduled',
    });

    expect(notified).toBe(1);
    const [moved] = await pending(db, eventId, 'event_rescheduled');
    expect(moved?.payload.text).toContain(online(moved.payload));
    const [reminder] = await pending(db, eventId, 'reminder_24h');
    expect(reminder?.payload.text).toContain(LINK);
  });

  it('writes the reminders again when the host changes the link, and tells nobody else', async () => {
    await createRsvpResolver(db, { eventId, userId: members[3].id });
    const before = await getEvent(db, eventId);
    if (!before) throw new Error('the event is missing');

    const notified = await announceUpdate(db, {
      before,
      after: { ...before, meetingUrl: MOVED },
      notice: null,
    });

    expect(notified).toBe(0);
    const reminders = await pending(db, eventId, 'reminder_24h');
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.payload.text).toContain(MOVED);
    expect(reminders[0]?.payload.text).not.toContain(LINK);
  });
});
