import { describe, expect, it } from 'vitest';
import { id } from '@founders-coffee/core';
import { readCommunityHealthCounts } from './community-health.js';
import { eventAttendance, eventCloseouts } from './schema.js';
import {
  setupDb,
  pastEvent,
  HOST_ID,
  MEMBER_ID,
  OTHER_ID,
} from './operations.fixtures.js';
import type { Db } from './db.js';
const DAY = 86_400_000;
const windows = {
  retentionDays: 60,
  recurringDays: 90,
  repeatDays: 90,
  minimumEvents: 2,
};
const report = (db: Db, city = '1', operatorHostId?: string) => {
  const now = Date.now();
  return readCommunityHealthCounts(
    db,
    {
      market: 'DZ',
      city,
      operatorHostId,
      from: new Date(now - 100 * DAY).toISOString(),
      to: new Date(now).toISOString(),
      asOf: new Date(now).toISOString(),
    },
    windows,
  );
};
const held = async (
  db: Db,
  daysAgo: number,
  hostId = HOST_ID,
  attendee: string | null = MEMBER_ID,
  walkInCount = 0,
  status: 'published' | 'cancelled' = 'published',
) => {
  const eventId = await pastEvent(db, {
    endedHoursAgo: daysAgo * 24,
    hostId,
    status,
  });
  const at = new Date(Date.now() - daysAgo * DAY + 1000);
  await db.insert(eventCloseouts).values({
    eventId,
    marketCode: 'DZ',
    stateCode: '16',
    cityCode: '1',
    outcome: 'held',
    walkInCount,
    submittedByUserId: hostId,
    submittedAt: at,
  });
  if (attendee)
    await db.insert(eventAttendance).values({
      id: id('att'),
      eventId,
      userId: attendee,
      marketCode: 'DZ',
      stateCode: '16',
      cityCode: '1',
      outcome: 'attended',
      recordedByUserId: hostId,
      recordedAt: at,
    });
  return eventId;
};
describe('community health aggregates (real D1)', () => {
  it('separates actual completion, mature host retention, returns and anonymous walk-ins', async () => {
    const db = await setupDb();
    await held(db, 80);
    await held(db, 50);
    await held(db, 10, OTHER_ID);
    await held(db, 5, HOST_ID, null, 3);
    await held(db, 4, HOST_ID, HOST_ID);
    await held(db, 3, HOST_ID, null);
    await held(db, 2, HOST_ID, MEMBER_ID, 0, 'cancelled');
    await pastEvent(db, { endedHoursAgo: 24 });
    const counts = await report(db);
    expect(counts).toMatchObject({
      completed: 4,
      independentCompleted: 4,
      periodUniqueAttendees: 1,
      firstTimeHosts: 2,
      pendingHosts30d: 1,
      firstTimeAttendees: 1,
      pendingAttendees30d: 0,
      activeHosts: 2,
      recurringHosts: 1,
      eligibleHosts: 1,
      retainedHosts: 1,
      identifiedAttendees: 1,
      repeatingAttendees: 1,
      returningAttendees: 1,
      walkIns: 3,
      ended: 7,
      closedOut: 6,
    });
    expect(counts).toMatchObject({
      eligibleHosts30d: 1,
      retainedHosts30d: 1,
      eligibleAttendees30d: 1,
      retainedAttendees30d: 1,
    });
    expect(await report(db, '1', HOST_ID)).toMatchObject({
      completed: 4,
      independentCompleted: 1,
      activeHosts: 1,
      recurringHosts: 0,
      eligibleHosts30d: 0,
    });
    expect(JSON.stringify(counts)).not.toContain(MEMBER_ID);
    expect((await report(db, '2')).completed).toBe(0);
  });
  it('requires a later local date for campaign returns and a full 30-day observation window', async () => {
    const db = await setupDb();
    await held(db, 40);
    await held(db, 40);
    await held(db, 5, OTHER_ID, OTHER_ID);
    expect(await report(db)).toMatchObject({
      eligibleHosts30d: 1,
      retainedHosts30d: 0,
      eligibleAttendees30d: 1,
      retainedAttendees30d: 0,
      returningAttendees: 0,
    });
  });

  it('does not count no-shows or immature hosts as retained', async () => {
    const db = await setupDb();
    const eventId = await held(db, 5);
    await db.run(
      (await import('drizzle-orm'))
        .sql`UPDATE event_attendance SET outcome = 'no_show' WHERE event_id = ${eventId}`,
    );
    expect(await report(db)).toMatchObject({
      completed: 0,
      eligibleHosts: 0,
      retainedHosts: 0,
      identifiedAttendees: 0,
    });
  });
});
