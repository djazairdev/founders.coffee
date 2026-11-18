import { beforeAll, describe, expect, it } from 'vitest';

import type { Db, Event } from '@founders-coffee/db';
import { geo } from '@founders-coffee/domain';

import { setupDb } from '../events/resolver.fixtures.js';
import { hostAnEventInAlgiers } from '../events/update.fixtures.js';
import { resolveCityLanding, resolveMarketLanding } from './resolver.js';

const ids = (items: readonly { readonly id: string }[]) =>
  items.map((item) => item.id);

const algiers = () => {
  const city = geo.findCity('DZ', '556');
  if (!city) throw new Error('Algiers is missing from the geo data');
  return city;
};

describe('filtering a landing by event type (B-EVT-05, real D1)', () => {
  let db: Db;
  let meetup: Event;
  let workshop: Event;

  beforeAll(async () => {
    db = await setupDb();
    meetup = await hostAnEventInAlgiers(db, { title: 'A filtered meetup' });
    workshop = await hostAnEventInAlgiers(db, {
      title: 'A filtered workshop',
      kind: 'workshop',
    });
  });

  it('lists only that type on the market page, and every type without a filter', async () => {
    const all = await resolveMarketLanding(db, 'DZ');
    const workshops = await resolveMarketLanding(db, 'DZ', {
      kind: 'workshop',
    });
    const meetups = await resolveMarketLanding(db, 'DZ', { kind: 'meetup' });
    if (!all.ok || !workshops.ok || !meetups.ok) throw new Error('read failed');

    expect(ids(all.data.events)).toEqual(
      expect.arrayContaining([meetup.id, workshop.id]),
    );
    expect(ids(workshops.data.events)).toContain(workshop.id);
    expect(workshops.data.events.every((e) => e.kind === 'workshop')).toBe(
      true,
    );
    expect(ids(meetups.data.events)).toContain(meetup.id);
    expect(ids(meetups.data.events)).not.toContain(workshop.id);
  });

  it('keeps the city counts whole while the list is filtered', async () => {
    const all = await resolveMarketLanding(db, 'DZ');
    const hackathons = await resolveMarketLanding(db, 'DZ', {
      kind: 'hackathon',
    });
    if (!all.ok || !hackathons.ok) throw new Error('read failed');

    expect(hackathons.data.events).toEqual([]);
    expect(hackathons.data.cityEventCounts).toEqual(all.data.cityEventCounts);
  });

  it('filters the city page the same way', async () => {
    const page = await resolveCityLanding(
      db,
      { marketKey: 'DZ', citySlug: algiers().slug },
      { kind: 'workshop' },
    );
    if (!page.ok) throw page.error;

    expect(ids(page.data.events)).toContain(workshop.id);
    expect(ids(page.data.events)).not.toContain(meetup.id);
  });

  it('refuses a cursor that names an event of another type', async () => {
    const cursor = {
      afterStartsAt: meetup.startsAt.getTime(),
      afterId: meetup.id,
    };
    const asMeetups = await resolveMarketLanding(db, 'DZ', {
      ...cursor,
      kind: 'meetup',
    });
    const asWorkshops = await resolveMarketLanding(db, 'DZ', {
      ...cursor,
      kind: 'workshop',
    });
    if (!asMeetups.ok || !asWorkshops.ok) throw new Error('read failed');

    expect(asMeetups.data.cursorValid).toBe(true);
    expect(asWorkshops.data.cursorValid).toBe(false);
  });
});
