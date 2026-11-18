import { beforeAll, describe, expect, it } from 'vitest';

import { eq } from 'drizzle-orm';

import { deleteOrganisationIfUnused } from './organisations.js';
import { createEventIfRouteAvailable } from './events-publish.js';
import { TEST_HOST_ID, baseEvent, setupDb } from './events.fixtures.js';
import type { Db } from './db.js';
import { eventOrganisers, organization, session } from './schema.js';

let db: Db;
let sequence = 0;

const createOrganisation = async (id: string) => {
  await db.insert(organization).values({
    id,
    name: `Organisation ${id}`,
    slug: id,
    kind: 'club',
    status: 'approved',
    marketCode: 'DZ',
    description: 'An organisation for deletion tests.',
  });
};

describe('organisation deletion (real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('deletes an unused organisation and clears active session references', async () => {
    const organisationId = `org_delete_unused_${++sequence}`;
    await createOrganisation(organisationId);
    await db.insert(session).values({
      id: `session_delete_${sequence}`,
      userId: TEST_HOST_ID,
      token: `token_delete_${sequence}`,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      activeOrganizationId: organisationId,
    });

    expect(await deleteOrganisationIfUnused(db, organisationId)).toBe(true);
    expect(
      await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, organisationId)),
    ).toEqual([]);
    expect(
      await db
        .select({ activeOrganizationId: session.activeOrganizationId })
        .from(session)
        .where(eq(session.id, `session_delete_${sequence}`)),
    ).toEqual([{ activeOrganizationId: null }]);
  });

  it('keeps an organisation that still organises an event', async () => {
    const organisationId = `org_delete_linked_${++sequence}`;
    await createOrganisation(organisationId);
    const eventId = `evt_orgdelete_${sequence}`;
    const event = {
      ...baseEvent,
      id: eventId,
      slug: `org-delete-event-${sequence}`,
    };
    await createEventIfRouteAvailable(db, event, organisationId);

    expect(await deleteOrganisationIfUnused(db, organisationId)).toBe(false);
    expect(
      await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, organisationId)),
    ).toEqual([{ id: organisationId }]);
    expect(
      await db
        .select({ eventId: eventOrganisers.eventId })
        .from(eventOrganisers)
        .where(eq(eventOrganisers.organisationId, organisationId)),
    ).toEqual([{ eventId }]);
  });
});
