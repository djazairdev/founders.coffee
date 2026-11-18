import { beforeEach, describe, expect, it } from 'vitest';

import { eq, events, submitCloseout, type Db } from '@founders-coffee/db';
import {
  HOST_ID,
  OTHER_ID,
  enableOperations,
  futureEvent,
  pastEvent,
  setupDb,
} from '@founders-coffee/db/operations-fixtures';

import { coOrganise, organisation, signUp } from './organisers.fixtures.js';
import { readRepeatEventTemplate } from './repeat.js';

const close = async (
  db: Db,
  eventId: string,
  outcome: 'held' | 'did_not_happen' = 'held',
) => {
  await submitCloseout(db, {
    eventId,
    actorId: HOST_ID,
    outcome,
    walkInCount: 0,
    wouldHostAgain: null,
    hostFriction: [],
    auditId: `aud_repeat_${eventId}`,
  });
};

describe('readRepeatEventTemplate', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
    await enableOperations(db);
  });

  it('returns only safe, editable fields from a held event', async () => {
    const eventId = await pastEvent(db);
    await close(db, eventId);

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: HOST_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      sourceEventId: eventId,
      marketCode: 'DZ',
      cityCode: '1',
      title: 'Ops fixture 1',
      description: 'An event used to exercise the operations schema.',
      venue: 'Café des Délices, Hydra',
      venueAddress: null,
      latitude: null,
      longitude: null,
      languages: ['fr'],
      kind: 'meetup',
      format: 'in_person',
      meetingUrl: null,
      tags: [],
      organisationId: null,
    });
    expect(result.data).not.toHaveProperty('startsAt');
    expect(result.data).not.toHaveProperty('endsAt');
    expect(result.data).not.toHaveProperty('rsvps');
    expect(result.data).not.toHaveProperty('slug');
  });

  it('carries every language the meetup was held in', async () => {
    const eventId = await pastEvent(db);
    await db
      .update(events)
      .set({ languages: ['ar', 'ber'] })
      .where(eq(events.id, eventId))
      .run();
    await close(db, eventId);

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: HOST_ID,
    });

    expect(result.ok && result.data.languages).toEqual(['ar', 'ber']);
  });

  it('repeats a workshop as a workshop, and no hackathon through the meetup wizard', async () => {
    const workshop = await pastEvent(db);
    const hackathon = await pastEvent(db);
    await db
      .update(events)
      .set({ kind: 'workshop' })
      .where(eq(events.id, workshop))
      .run();
    await db
      .update(events)
      .set({ kind: 'hackathon' })
      .where(eq(events.id, hackathon))
      .run();
    await close(db, workshop);
    await close(db, hackathon);

    const repeated = await readRepeatEventTemplate(db, {
      eventId: workshop,
      actorId: HOST_ID,
    });
    const refused = await readRepeatEventTemplate(db, {
      eventId: hackathon,
      actorId: HOST_ID,
    });

    expect(repeated.ok && repeated.data.kind).toBe('workshop');
    expect(refused.ok).toBe(false);
    if (!refused.ok)
      expect(refused.error.code).toBe('repeat_event_not_eligible');
  });

  it('keeps the format, link and tags of an online event, with no venue (B-EVT-21)', async () => {
    const eventId = await pastEvent(db);
    await db
      .update(events)
      .set({
        format: 'online',
        meetingUrl: 'https://meet.example.org/founders',
        venue: null,
        tags: ['product', 'design'],
      })
      .where(eq(events.id, eventId))
      .run();
    await close(db, eventId);

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: HOST_ID,
    });

    expect(result.ok && result.data).toMatchObject({
      venue: null,
      format: 'online',
      meetingUrl: 'https://meet.example.org/founders',
      tags: ['product', 'design'],
    });
  });

  it('lets a member of its lead organisation repeat it, under that organisation', async () => {
    const eventId = await pastEvent(db);
    await close(db, eventId);
    await signUp(db, 'usr_org_member');
    await organisation(db, 'org_lead', 'usr_org_member');
    await coOrganise(db, eventId, 'org_lead', 'lead');

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: 'usr_org_member',
    });

    expect(result.ok && result.data.organisationId).toBe('org_lead');
  });

  it('lets a member of a co-hosting organisation repeat it, naming the lead', async () => {
    const eventId = await pastEvent(db);
    await close(db, eventId);
    await signUp(db, 'usr_lead_member');
    await signUp(db, 'usr_cohost_member');
    await organisation(db, 'org_lead', 'usr_lead_member');
    await organisation(db, 'org_cohost', 'usr_cohost_member');
    await coOrganise(db, eventId, 'org_lead', 'lead');
    await coOrganise(db, eventId, 'org_cohost');

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: 'usr_cohost_member',
    });

    expect(result.ok && result.data.organisationId).toBe('org_lead');
  });

  it('refuses a member of an organisation that does not organise it', async () => {
    const eventId = await pastEvent(db);
    await close(db, eventId);
    await signUp(db, 'usr_elsewhere');
    await organisation(db, 'org_elsewhere', 'usr_elsewhere');

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: 'usr_elsewhere',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('repeat_event_not_host');
  });

  it('refuses a template for another host', async () => {
    const eventId = await pastEvent(db);
    await close(db, eventId);

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: OTHER_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('repeat_event_not_host');
  });

  it.each([
    ['an upcoming event', () => futureEvent(db)],
    ['an event without a closeout', () => pastEvent(db)],
  ])('refuses %s', async (_label, makeEvent) => {
    const result = await readRepeatEventTemplate(db, {
      eventId: await makeEvent(),
      actorId: HOST_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('repeat_event_not_eligible');
  });

  it('refuses a gathering marked did not happen', async () => {
    const eventId = await pastEvent(db);
    await close(db, eventId, 'did_not_happen');

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: HOST_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('repeat_event_not_eligible');
  });

  it('refuses when community operations are disabled', async () => {
    const eventId = await pastEvent(db);
    await close(db, eventId);
    await enableOperations(db, false);

    const result = await readRepeatEventTemplate(db, {
      eventId,
      actorId: HOST_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('operations_disabled');
  });
});
