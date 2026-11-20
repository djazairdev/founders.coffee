import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';

import { getCloseout } from './operations-closeout.js';
import { createAdminCloseout } from './operations-admin-closeout.js';
import { eventAttendance, eventFeedback } from './schema.js';
import type { Db } from './db.js';
import {
  auditRows,
  HOST_ID,
  MEMBER_ID,
  pastEvent,
  setupDb,
} from './operations.fixtures.js';

const operator = {
  actorId: HOST_ID,
  accessSubject: 'access|operator',
};

describe('createAdminCloseout', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
  });

  it('records the admin actor and admin provenance without inventing attendance', async () => {
    const eventId = await pastEvent(db, { attendees: [MEMBER_ID] });

    const result = await createAdminCloseout(db, {
      ...operator,
      eventId,
      outcome: 'held',
      auditId: id('aud'),
    });

    expect(result).toBe('created');
    expect(await getCloseout(db, eventId)).toMatchObject({
      outcome: 'held',
      submittedByUserId: HOST_ID,
      walkInCount: 0,
      wouldHostAgain: null,
      hostFriction: [],
      version: 0,
    });
    expect(await db.select().from(eventAttendance)).toEqual([]);
    expect(await auditRows(db)).toEqual([
      expect.objectContaining({
        action: 'admin_closeout_created',
        actorUserId: HOST_ID,
        accessSubject: 'access|operator',
        targetType: 'closeout',
        targetId: eventId,
        reasonCode: 'delivery_recovery',
        metadata: {
          provenance: 'admin',
          outcome: 'held',
          attendanceRecorded: false,
        },
      }),
    ]);
  });

  it('writes one closeout and one audit record when two admins race', async () => {
    const eventId = await pastEvent(db);
    const results = await Promise.all(
      ['aud_admin_a', 'aud_admin_b'].map((auditId) =>
        createAdminCloseout(db, {
          ...operator,
          eventId,
          outcome: 'held',
          auditId,
        }),
      ),
    );

    expect(results.sort()).toEqual(['already_closed', 'created']);
    expect(await auditRows(db)).toHaveLength(1);
  });

  it('refuses an existing outcome, cancelled or unfinished events', async () => {
    const existing = await pastEvent(db);
    const cancelled = await pastEvent(db, { status: 'cancelled' });
    const unfinished = await pastEvent(db, { endedHoursAgo: -1 });
    await createAdminCloseout(db, {
      ...operator,
      eventId: existing,
      outcome: 'held',
      auditId: id('aud'),
    });

    const outcomes = await Promise.all(
      [existing, cancelled, unfinished].map((eventId) =>
        createAdminCloseout(db, {
          ...operator,
          eventId,
          outcome: 'did_not_happen',
          auditId: id('aud'),
        }),
      ),
    );

    expect(outcomes).toEqual(['already_closed', 'not_eligible', 'not_eligible']);
    expect(await auditRows(db)).toHaveLength(1);
  });

  it('does not mark an event as not held when attendance or feedback exists', async () => {
    const withAttendance = await pastEvent(db);
    const withFeedback = await pastEvent(db);
    await db.insert(eventAttendance).values({
      id: id('att'),
      eventId: withAttendance,
      userId: MEMBER_ID,
      marketCode: 'DZ',
      stateCode: '16',
      cityCode: '1',
      outcome: 'attended',
      recordedByUserId: HOST_ID,
    });
    await db.insert(eventFeedback).values({
      id: id('fb'),
      eventId: withFeedback,
      userId: MEMBER_ID,
      marketCode: 'DZ',
      stateCode: '16',
      cityCode: '1',
      valueRating: 'valuable',
      wouldReturn: true,
    });

    const outcomes = await Promise.all(
      [withAttendance, withFeedback].map((eventId) =>
        createAdminCloseout(db, {
          ...operator,
          eventId,
          outcome: 'did_not_happen',
          auditId: id('aud'),
        }),
      ),
    );

    expect(outcomes).toEqual(['not_eligible', 'not_eligible']);
    expect(await auditRows(db)).toEqual([]);
  });
});
