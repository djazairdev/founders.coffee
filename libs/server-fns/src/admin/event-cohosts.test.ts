import { beforeAll, describe, expect, it } from 'vitest';

import {
  eq,
  listAuditForTarget,
  organization,
  type Db,
  type Event,
} from '@founders-coffee/db';

import {
  coOrganise,
  organisation,
  signUp,
} from '../events/organisers.fixtures.js';
import { eventDetail } from '../events/detail.js';
import { setupDb } from '../events/resolver.fixtures.js';
import { hostAnEvent } from '../events/update.fixtures.js';
import {
  addEventCoHostResolver,
  eventCoHostsResolver,
  readEventReference,
  removeEventCoHostResolver,
} from './event-cohosts.js';

const OPERATOR = { actorUserId: 'usr_cohost_operator', accessSubject: 'ops' };
const MEMBER_ID = 'usr_cohost_member01';

const codeOf = async (result: Promise<{ ok: boolean; error?: unknown }>) => {
  const settled = await result;
  return settled.ok ? null : (settled.error as { code: string }).code;
};

describe('an operator names the co-hosts of an event (B-EVT-20, real D1)', () => {
  let db: Db;
  let event: Event;

  const audit = () =>
    listAuditForTarget(db, {
      targetType: 'event',
      targetId: event.id,
      limit: 20,
    });

  const runBy = async () => {
    const detail = await eventDetail(db, event);
    return detail.runBy;
  };

  beforeAll(async () => {
    db = await setupDb();
    await signUp(db, MEMBER_ID);
    await signUp(db, OPERATOR.actorUserId);
    await organisation(db, 'org_cohost_lead', MEMBER_ID, { name: 'Lead Club' });
    await organisation(db, 'org_cohost_gdg', MEMBER_ID, { name: 'GDG Oran' });
    await organisation(db, 'org_cohost_waiting', MEMBER_ID, {
      status: 'pending',
    });
    await organisation(db, 'org_cohost_cairo', MEMBER_ID, {
      name: 'Cairo Hub',
    });
    await db
      .update(organization)
      .set({ marketCode: 'EG' })
      .where(eq(organization.id, 'org_cohost_cairo'));
    event = await hostAnEvent(db, { title: 'An evening to co-host' });
    await coOrganise(db, event.id, 'org_cohost_lead', 'lead');
  });

  it('finds the event by its id or its address, with what could co-host it', async () => {
    for (const reference of [
      event.id,
      `https://founders.coffee/en/algeria/e/${event.slug}?chat=true`,
      `algeria/e/${event.slug}`,
    ]) {
      const found = await eventCoHostsResolver(db, reference);
      if (!found.ok) throw found.error;
      expect(found.data.event.id).toBe(event.id);
      expect(found.data.organisers).toEqual([
        expect.objectContaining({
          organisationId: 'org_cohost_lead',
          role: 'lead',
        }),
      ]);
      const candidates = found.data.candidates.map(
        (candidate) => candidate.organisationId,
      );
      expect(candidates).toContain('org_cohost_gdg');
      expect(candidates).not.toContain('org_cohost_lead');
      expect(candidates).not.toContain('org_cohost_waiting');
      expect(candidates).not.toContain('org_cohost_cairo');
    }
    for (const reference of [
      'evt_00000000000000000000000000000000',
      '/en/algeria/e/no-such-evening',
      '/en/atlantis/e/whatever',
      'just some words',
    ])
      expect(await codeOf(eventCoHostsResolver(db, reference))).toBe(
        'event_not_found',
      );
  });

  it('adds a co-host, audits it, and the event is labelled co-hosted', async () => {
    expect(await runBy()).toEqual({ kind: 'community' });

    const added = await addEventCoHostResolver(
      db,
      { eventId: event.id, organisationId: 'org_cohost_gdg' },
      OPERATOR,
    );
    if (!added.ok) throw added.error;

    expect(added.data.organisers.map((row) => [row.name, row.role])).toEqual([
      ['Lead Club', 'lead'],
      ['GDG Oran', 'co_host'],
    ]);
    expect(await runBy()).toEqual({
      kind: 'co_hosted',
      organisations: [
        { name: 'Lead Club', slug: 'org_cohost_lead' },
        { name: 'GDG Oran', slug: 'org_cohost_gdg' },
      ],
    });
    expect(await audit()).toEqual([
      expect.objectContaining({
        action: 'co_host_added',
        targetType: 'event',
        actorUserId: OPERATOR.actorUserId,
        accessSubject: 'ops',
        marketCode: 'DZ',
        metadata: { organisationId: 'org_cohost_gdg' },
      }),
    ]);
  });

  it('refuses one already named, one not approved and one from another market, auditing none', async () => {
    const before = (await audit()).length;
    const add = (organisationId: string) =>
      codeOf(
        addEventCoHostResolver(
          db,
          { eventId: event.id, organisationId },
          OPERATOR,
        ),
      );

    expect(await add('org_cohost_gdg')).toBe('organisation_already_organiser');
    expect(await add('org_cohost_lead')).toBe('organisation_already_organiser');
    expect(await add('org_cohost_waiting')).toBe('organisation_not_approved');
    expect(await add('org_cohost_cairo')).toBe('organisation_not_approved');
    expect(
      await codeOf(
        addEventCoHostResolver(
          db,
          {
            eventId: 'evt_00000000000000000000000000000000',
            organisationId: 'org_cohost_gdg',
          },
          OPERATOR,
        ),
      ),
    ).toBe('event_not_found');
    expect(await audit()).toHaveLength(before);
  });

  it('removes a co-host, audited, and never the lead', async () => {
    const remove = (organisationId: string) =>
      removeEventCoHostResolver(
        db,
        { eventId: event.id, organisationId },
        OPERATOR,
      );

    expect(await codeOf(remove('org_cohost_lead'))).toBe(
      'organisation_not_co_host',
    );
    const removed = await remove('org_cohost_gdg');
    if (!removed.ok) throw removed.error;

    expect(removed.data.organisers.map((row) => row.role)).toEqual(['lead']);
    expect(await codeOf(remove('org_cohost_gdg'))).toBe(
      'organisation_not_co_host',
    );
    expect(await runBy()).toEqual({ kind: 'community' });
    expect((await audit()).map((row) => row.action).sort()).toEqual([
      'co_host_added',
      'co_host_removed',
    ]);
  });
});

describe('reading what an operator pasted', () => {
  it.each([
    [
      'evt_0123456789abcdef0123456789abcdef',
      { kind: 'id', eventId: 'evt_0123456789abcdef0123456789abcdef' },
    ],
    [
      'https://founders.coffee/ar/algeria/e/coffee',
      { kind: 'address', marketSlug: 'algeria', slug: 'coffee' },
    ],
    [
      '/algeria/e/coffee',
      { kind: 'address', marketSlug: 'algeria', slug: 'coffee' },
    ],
    [
      ' algeria/e/%D9%82%D9%87%D9%88%D8%A9 ',
      { kind: 'address', marketSlug: 'algeria', slug: 'قهوة' },
    ],
  ])('reads %s', (reference, expected) => {
    expect(readEventReference(reference)).toEqual(expected);
  });

  it.each([
    '',
    'coffee',
    '/en/algeria',
    '/e/coffee',
    '/en/algeria/e/coffee/extra',
  ])('reads %j as no event', (reference) => {
    expect(readEventReference(reference)).toBeNull();
  });
});
