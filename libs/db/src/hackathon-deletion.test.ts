import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { id } from '@founders-coffee/core';

import type { Db } from './db.js';
import { insertLeadOrganiser } from './event-organisers.js';
import { setupDb, TEST_HOST_ID } from './events.fixtures.js';
import { getHackathon } from './hackathons.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import {
  deleteHackathon,
  searchHackathonsForDeletion,
} from './hackathon-deletion.js';
import { listAuditForTarget } from './operations-audit.js';
import {
  events,
  eventOrganisers,
  hackathonCertificates,
  hackathonInterestLaunches,
  hackathons,
  organization,
  scheduledNotifications,
} from './schema.js';

let db: Db;

describe('hackathon deletion (B-HKN-27, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
  });

  const addOrganisation = async (id: string) => {
    await db
      .insert(organization)
      .values({
        id,
        name: 'Hackathon Deletion Club',
        slug: id,
        kind: 'club',
        status: 'approved',
        marketCode: 'DZ',
        description: 'An organisation for hackathon deletion tests.',
      })
      .onConflictDoNothing();
  };

  it('hides a hackathon while retaining its details and recording the deletion', async () => {
    const event = hackathonEventRow();
    await createHackathon(db, event);
    const organisationId = 'org_delete_lead';
    await addOrganisation(organisationId);
    await insertLeadOrganiser(db, {
      eventId: event.id,
      organisationId,
    });
    const auditId = id('aud');

    expect(
      await deleteHackathon(db, {
        eventId: event.id,
        organisationId,
        actorUserId: TEST_HOST_ID,
        accessSubject: 'operator@example.com',
        auditId,
      }),
    ).toBe(true);

    const [deletedEvent] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, event.id));
    const [retainedHackathon] = await db
      .select({ eventId: hackathons.eventId })
      .from(hackathons)
      .where(eq(hackathons.eventId, event.id));

    expect(deletedEvent?.status).toBe('deleted');
    expect(retainedHackathon?.eventId).toBe(event.id);
    expect(await getHackathon(db, event.id)).toBeNull();
    expect(await searchHackathonsForDeletion(db, event.title)).toEqual([]);
    expect(
      await listAuditForTarget(db, {
        targetType: 'hackathon',
        targetId: event.id,
        limit: 5,
      }),
    ).toMatchObject([
      {
        id: auditId,
        actorUserId: TEST_HOST_ID,
        accessSubject: 'operator@example.com',
        action: 'deleted',
      },
    ]);

    expect(
      await deleteHackathon(db, {
        eventId: event.id,
        actorUserId: TEST_HOST_ID,
        accessSubject: null,
        auditId: id('aud'),
      }),
    ).toBe(false);
    expect(
      await listAuditForTarget(db, {
        targetType: 'hackathon',
        targetId: event.id,
        limit: 5,
      }),
    ).toHaveLength(1);
  });

  it('refuses an organiser delete after the lead organisation changes', async () => {
    const event = hackathonEventRow();
    await createHackathon(db, event);
    const originalOrganisationId = 'org_delete_original';
    const replacementOrganisationId = 'org_delete_replacement';
    await addOrganisation(originalOrganisationId);
    await addOrganisation(replacementOrganisationId);
    await insertLeadOrganiser(db, {
      eventId: event.id,
      organisationId: originalOrganisationId,
    });
    await db
      .delete(eventOrganisers)
      .where(eq(eventOrganisers.eventId, event.id));
    await db.insert(eventOrganisers).values({
      eventId: event.id,
      organisationId: replacementOrganisationId,
      role: 'lead',
    });

    expect(
      await deleteHackathon(db, {
        eventId: event.id,
        organisationId: originalOrganisationId,
        actorUserId: TEST_HOST_ID,
        accessSubject: null,
        auditId: id('aud'),
      }),
    ).toBe(false);
    expect(await getHackathon(db, event.id)).not.toBeNull();
    expect(
      await listAuditForTarget(db, {
        targetType: 'hackathon',
        targetId: event.id,
        limit: 5,
      }),
    ).toHaveLength(0);
  });

  it('deletes an unpublished draft while retaining its details', async () => {
    const event = { ...hackathonEventRow(), status: 'draft' as const };
    await createHackathon(db, event);

    expect(
      await deleteHackathon(db, {
        eventId: event.id,
        actorUserId: TEST_HOST_ID,
        accessSubject: null,
        auditId: id('aud'),
      }),
    ).toBe(true);

    const [deletedEvent] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, event.id));
    expect(deletedEvent?.status).toBe('deleted');
    expect(await getHackathon(db, event.id)).toBeNull();
  });

  it('stops pending notifications and interest launches and revokes active certificates', async () => {
    const event = hackathonEventRow();
    await createHackathon(db, event);
    await db
      .delete(hackathonInterestLaunches)
      .where(eq(hackathonInterestLaunches.marketCode, event.marketCode));
    const notificationId = id('ntf');
    const launchId = id('hil');
    const certificateId = id('crt');
    await db.insert(scheduledNotifications).values({
      id: notificationId,
      eventId: event.id,
      userId: TEST_HOST_ID,
      templateKey: 'hackathon_kickoff',
      payload: {},
      sendAt: new Date('2099-01-15T09:00:00Z'),
    });
    await db.insert(hackathonInterestLaunches).values({
      id: launchId,
      eventId: event.id,
      marketCode: event.marketCode,
    });
    await db.insert(hackathonCertificates).values({
      id: certificateId,
      eventId: event.id,
      userId: TEST_HOST_ID,
      kind: 'participant',
      placement: null,
      verificationCode: id('vfy'),
      issuedAt: new Date('2099-01-30T18:00:00Z'),
    });

    await deleteHackathon(db, {
      eventId: event.id,
      actorUserId: TEST_HOST_ID,
      accessSubject: null,
      auditId: id('aud'),
    });

    const [notification] = await db
      .select({ status: scheduledNotifications.status })
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.id, notificationId));
    const [launch] = await db
      .select({ status: hackathonInterestLaunches.status })
      .from(hackathonInterestLaunches)
      .where(eq(hackathonInterestLaunches.id, launchId));
    const [certificate] = await db
      .select({ revokedAt: hackathonCertificates.revokedAt })
      .from(hackathonCertificates)
      .where(eq(hackathonCertificates.id, certificateId));

    expect(notification?.status).toBe('cancelled');
    expect(launch?.status).toBe('cancelled');
    expect(certificate?.revokedAt).toBeInstanceOf(Date);
  });
});
