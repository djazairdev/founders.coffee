import { beforeAll, describe, expect, it } from 'vitest';

import type { Db, Event } from '@founders-coffee/db';

import { resolveMarketLanding } from '../markets/resolver.js';
import { eventDetail } from './detail.js';
import { listHostedEventPage } from './hosted.js';
import { listJoinedEventPage } from './joined.js';
import { coOrganise, organisation, signUp } from './organisers.fixtures.js';
import { readEventPage } from './page.js';
import { listEvents } from './resolver.js';
import { setupDb, TEST_HOST_ID } from './resolver.fixtures.js';
import { hostAnEvent } from './update.fixtures.js';

const MEMBER_ID = 'usr_runby_member01';

const runByOf = (
  items: readonly { readonly id: string; readonly runBy: unknown }[],
  event: Event,
) => items.find((item) => item.id === event.id)?.runBy;

describe('who runs each event (B-EVT-19, real D1)', () => {
  let db: Db;
  let community: Event;
  let alone: Event;
  let coHosted: Event;
  let platform: Event;
  let suspended: Event;

  beforeAll(async () => {
    db = await setupDb();
    await signUp(db, MEMBER_ID);
    await organisation(db, 'org_runby_club', MEMBER_ID, {
      name: 'Code Club Alger',
    });
    await organisation(db, 'org_runby_gdg', MEMBER_ID, { name: 'GDG Algiers' });
    await organisation(db, 'org_runby_platform', MEMBER_ID, {
      name: 'founders.coffee',
      kind: 'platform',
    });
    await organisation(db, 'org_runby_gone', MEMBER_ID, {
      name: 'Suspended Society',
      status: 'suspended',
    });

    community = await hostAnEvent(db, { title: 'A community evening' });
    alone = await hostAnEvent(db, { title: 'One club evening' });
    await coOrganise(db, alone.id, 'org_runby_club', 'lead');
    coHosted = await hostAnEvent(db, { title: 'Two clubs evening' });
    await coOrganise(db, coHosted.id, 'org_runby_gdg');
    await coOrganise(db, coHosted.id, 'org_runby_club', 'lead');
    platform = await hostAnEvent(db, { title: 'The platform evening' });
    await coOrganise(db, platform.id, 'org_runby_platform', 'lead');
    await coOrganise(db, platform.id, 'org_runby_club');
    suspended = await hostAnEvent(db, { title: 'A suspended co-host' });
    await coOrganise(db, suspended.id, 'org_runby_club', 'lead');
    await coOrganise(db, suspended.id, 'org_runby_gone');
  });

  const expected = () =>
    new Map<Event, unknown>([
      [community, { kind: 'community' }],
      [alone, { kind: 'community' }],
      [
        coHosted,
        {
          kind: 'co_hosted',
          organisations: [
            { name: 'Code Club Alger', slug: 'org_runby_club' },
            { name: 'GDG Algiers', slug: 'org_runby_gdg' },
          ],
        },
      ],
      [platform, { kind: 'platform' }],
      [suspended, { kind: 'community' }],
    ]);

  it('labels every card of the listing and the market page', async () => {
    const upcoming = await listEvents(db, { marketCode: 'DZ', limit: 100 });
    const landing = await resolveMarketLanding(db, 'DZ');
    if (!landing.ok) throw landing.error;

    for (const [event, runBy] of expected()) {
      expect(runByOf(upcoming.items, event)).toEqual(runBy);
      expect(runByOf(landing.data.events, event)).toEqual(runBy);
    }
  });

  it('labels the host’s list and the member’s joined list', async () => {
    const hosted = await listHostedEventPage(db, {
      hostId: TEST_HOST_ID,
      limit: 100,
    });
    const joined = await listJoinedEventPage(db, {
      userId: TEST_HOST_ID,
      limit: 100,
    });

    for (const [event, runBy] of expected()) {
      expect(runByOf(hosted.items, event)).toEqual(runBy);
      expect(runByOf(joined.items, event)).toEqual(runBy);
    }
  });

  it('labels the meetup page from its own batch, and the short address the same', async () => {
    for (const [event, runBy] of expected()) {
      const page = await readEventPage(
        db,
        { marketCode: event.marketCode, slug: event.slug },
        Promise.resolve(undefined),
      );
      if (!page.ok) throw page.error;
      expect(page.data.event.runBy).toEqual(runBy);
      expect((await eventDetail(db, event)).runBy).toEqual(runBy);
    }
  });
});
