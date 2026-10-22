import { and, eq, inArray, sql } from 'drizzle-orm';

import type { NOTIFICATION_TEMPLATE_KEYS } from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { scheduledNotifications } from './schema.js';

/**
 * Retire one member's pending messages of particular kinds for an event (B-HKN-21): a participant
 * who withdraws keeps no reminder, while the organisers' reminders for the same event stay.
 */
export const cancelNotificationsByUserTemplate = async (
  db: Db,
  opts: {
    eventId: string;
    userId: string;
    templateKeys: readonly (typeof NOTIFICATION_TEMPLATE_KEYS)[number][];
  },
): Promise<number> => {
  if (opts.templateKeys.length === 0) return 0;
  const result = await db
    .update(scheduledNotifications)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(scheduledNotifications.eventId, opts.eventId),
        eq(scheduledNotifications.userId, opts.userId),
        eq(scheduledNotifications.status, 'pending'),
        inArray(scheduledNotifications.templateKey, [...opts.templateKeys]),
      ),
    );

  return (result.meta?.changes ?? 0) as number;
};

/**
 * Move an event's pending messages of each kind to a new time, in one batch (B-HKN-21), for a
 * reminder whose date changed. A message whose new time has already passed is cancelled rather
 * than sent late, since it would announce something that is no longer ahead.
 */
export const moveNotificationsByTemplate = async (
  db: Db,
  opts: {
    eventId: string;
    moves: readonly {
      templateKey: (typeof NOTIFICATION_TEMPLATE_KEYS)[number];
      sendAt: Date;
    }[];
  },
): Promise<void> => {
  const [first, ...rest] = opts.moves.map(({ templateKey, sendAt }) => {
    const seconds = Math.floor(sendAt.getTime() / 1000);
    return db
      .update(scheduledNotifications)
      .set({
        sendAt,
        status: sql`CASE WHEN ${seconds} <= unixepoch() THEN 'cancelled' ELSE ${scheduledNotifications.status} END`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scheduledNotifications.eventId, opts.eventId),
          eq(scheduledNotifications.status, 'pending'),
          eq(scheduledNotifications.templateKey, templateKey),
        ),
      );
  });
  if (first) await batch(db, [first, ...rest]);
};
