import { beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';

import {
  HOST_ID,
  MEMBER_ID,
  OTHER_ID,
  auditRows,
  enableOperations,
  pastEvent,
  setupDb,
} from '@founders-coffee/db/operations-fixtures';
import {
  getCloseout,
  listAttendance,
  scheduledNotifications,
  type Db,
} from '@founders-coffee/db';

import {
  createMissingCloseoutResolver,
  listMissingCloseoutsResolver,
} from './closeouts.js';

describe('admin missing meetup closeouts', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
    await enableOperations(db);
  });

  it('lists ended meetups as soon as they end in enabled markets', async () => {
    const recent = await pastEvent(db, { endedHoursAgo: 2 });
    const otherMarket = await pastEvent(db, { endedHoursAgo: 30 });
    await db.run(
      sql`UPDATE events SET market_code = 'EG' WHERE id = ${otherMarket}`,
    );
    await db.run(
      sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.communityOperations', json('false')) WHERE code = 'EG'`,
    );

    const result = await listMissingCloseoutsResolver(db);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.map((item) => item.eventId)).toContain(recent);
      expect(result.data.items.map((item) => item.eventId)).not.toContain(
        otherMarket,
      );
    }
  });

  it('records an admin closeout without counting attendance as if known', async () => {
    const eventId = await pastEvent(db, { attendees: [MEMBER_ID] });

    const result = await createMissingCloseoutResolver(
      db,
      { eventId, outcome: 'held' },
      { actorId: OTHER_ID, accessSubject: 'access|ops' },
    );

    expect(result.ok).toBe(true);
    expect(await getCloseout(db, eventId)).toMatchObject({
      outcome: 'held',
      submittedByUserId: OTHER_ID,
      walkInCount: 0,
    });
    expect(await listAttendance(db, eventId)).toEqual([]);
    expect(await auditRows(db)).toEqual([
      expect.objectContaining({
        action: 'admin_closeout_created',
        actorUserId: OTHER_ID,
        accessSubject: 'access|ops',
      }),
    ]);
    const queue = await listMissingCloseoutsResolver(db);
    expect(queue.ok).toBe(true);
    if (queue.ok)
      expect(queue.data.items.map((item) => item.eventId)).not.toContain(
        eventId,
      );
  });

  it('notifies RSVPed participants if the admin records that it did not happen', async () => {
    const eventId = await pastEvent(db, { attendees: [MEMBER_ID] });

    await createMissingCloseoutResolver(
      db,
      { eventId, outcome: 'did_not_happen' },
      { actorId: OTHER_ID, accessSubject: 'access|ops' },
    );

    const notices = await db
      .select()
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.eventId, eventId));
    expect(notices.map((notice) => notice.templateKey)).toContain(
      'event_did_not_happen',
    );
    expect(notices.map((notice) => notice.templateKey)).not.toContain(
      'feedback_invitation',
    );
    expect(await listAttendance(db, eventId)).toEqual([]);
  });

  it('rejects a duplicate rather than replacing an existing outcome', async () => {
    const eventId = await pastEvent(db);
    const actor = { actorId: HOST_ID, accessSubject: 'access|ops' };

    const created = await createMissingCloseoutResolver(
      db,
      { eventId, outcome: 'held' },
      actor,
    );
    const duplicate = await createMissingCloseoutResolver(
      db,
      { eventId, outcome: 'did_not_happen' },
      actor,
    );

    expect(created.ok).toBe(true);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok)
      expect(duplicate.error.code).toBe('closeout_already_closed');
    expect((await getCloseout(db, eventId))?.outcome).toBe('held');
  });

  it('refuses an event outside the community operations flag', async () => {
    const eventId = await pastEvent(db);
    await enableOperations(db, false);

    const result = await createMissingCloseoutResolver(
      db,
      { eventId, outcome: 'held' },
      { actorId: OTHER_ID, accessSubject: 'access|ops' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('operations_disabled');
  });
});
