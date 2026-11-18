import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  eventRsvps,
  events,
  getEvent,
  scheduledNotifications,
  type Db,
  type Event,
} from '@founders-coffee/db';
import { geo } from '@founders-coffee/domain';

import {
  resolveCityLanding,
  resolveMarketLanding,
} from '../markets/resolver.js';
import { resolveTrendingStates } from '../markets/trending.js';
import { createRsvpResolver } from '../rsvps/resolver.js';
import { answerEventCalendar } from './calendar.js';
import { readEventCard } from './card.js';
import { listHostedEventPage } from './hosted.js';
import { listJoinedEventPage } from './joined.js';
import { coOrganise, organisation, signUp } from './organisers.fixtures.js';
import { readEventPage } from './page.js';
import { readPublicEventFeed } from './public-feed.js';
import { listEvents, resolveEvent } from './resolver.js';
import { setupDb, TEST_HOST_ID } from './resolver.fixtures.js';
import { hostAnEvent } from './update.fixtures.js';

const STRANGER_ID = 'usr_draft_stranger1';
const ORGANISER_ID = 'usr_draft_organiser';

const ids = (items: readonly { readonly id: string }[]) =>
  items.map((item) => item.id);

/** A meetup turned back into a draft, organised by one organisation as co-host. */
const draftMeetup = async (db: Db, title: string): Promise<Event> => {
  const created = await hostAnEvent(db, { title });
  await db
    .update(events)
    .set({ status: 'draft' })
    .where(eq(events.id, created.id))
    .run();
  await signUp(db, STRANGER_ID);
  await signUp(db, ORGANISER_ID);
  await organisation(db, 'org_draft_cohost', ORGANISER_ID);
  await coOrganise(db, created.id, 'org_draft_cohost');
  const draft = await getEvent(db, created.id);
  if (!draft) throw new Error('fixture draft was not stored');
  return draft;
};

const landingCounts = async (db: Db) => {
  const landing = await resolveMarketLanding(db, 'DZ');
  const trending = await resolveTrendingStates(db, 'DZ');
  if (!landing.ok) throw landing.error;
  return {
    cities: landing.data.cityEventCounts,
    trending: JSON.stringify(trending),
  };
};

describe('a draft in every public read (real D1, B-EVT-16)', () => {
  let db: Db;
  let published: Event;

  beforeEach(async () => {
    db = await setupDb();
    published = await hostAnEvent(db, { title: 'A published meetup' });
  });

  it('is in no listing, while the published meetup beside it is', async () => {
    const draft = await draftMeetup(db, 'A draft meetup');
    const city = geo.findCity('DZ', draft.cityCode);
    if (!city) throw new Error('the fixture city is unknown');

    const upcoming = await listEvents(db, { marketCode: 'DZ', limit: 100 });
    const market = await resolveMarketLanding(db, 'DZ');
    const cityPage = await resolveCityLanding(db, {
      marketKey: 'DZ',
      citySlug: city.slug,
    });
    const feed = await readPublicEventFeed(db, { limit: 50 });
    if (!market.ok || !cityPage.ok || !feed.ok) throw new Error('read failed');

    for (const list of [
      ids(upcoming.items),
      ids(market.data.events),
      ids(cityPage.data.events),
    ]) {
      expect(list).toContain(published.id);
      expect(list).not.toContain(draft.id);
    }
    expect(JSON.stringify(feed.data)).not.toContain(draft.slug);
    expect(JSON.stringify(feed.data)).toContain(published.slug);
  });

  it('counts for no city, state or host face', async () => {
    const before = await landingCounts(db);
    await draftMeetup(db, 'A draft that counts for nothing');

    expect(await landingCounts(db)).toEqual(before);
  });

  it('is in no profile list, its host’s own joined list included', async () => {
    const draft = await draftMeetup(db, 'A draft nobody lists');

    const hosted = await listHostedEventPage(db, { hostId: TEST_HOST_ID });
    const joined = await listJoinedEventPage(db, { userId: TEST_HOST_ID });

    expect(ids(hosted.items)).toContain(published.id);
    expect(ids(hosted.items)).not.toContain(draft.id);
    expect(ids(joined.items)).toContain(published.id);
    expect(ids(joined.items)).not.toContain(draft.id);
  });

  it('has no social card and no calendar file', async () => {
    const draft = await draftMeetup(db, 'A draft with no card');
    const calendar = (id: string) =>
      answerEventCalendar(db, {
        id,
        locale: 'en',
        target: 'ics',
        origin: 'https://founders.coffee',
      });

    expect(await readEventCard(db, draft.id)).toBeNull();
    expect(await calendar(draft.id)).toBeNull();
    expect(await readEventCard(db, published.id)).not.toBeNull();
    expect(await calendar(published.id)).not.toBeNull();
  });

  it('answers its page and its address as not found to all but its organisers', async () => {
    const draft = await draftMeetup(db, 'A draft only organisers open');
    const page = (viewer?: string) =>
      readEventPage(
        db,
        { marketCode: draft.marketCode, slug: draft.slug },
        Promise.resolve(viewer),
      );
    const byId = (viewer?: string) =>
      resolveEvent(db, { id: draft.id }, viewer);
    const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
      result.ok ? 'ok' : result.error?.code;

    for (const viewer of [undefined, STRANGER_ID]) {
      expect(codeOf(await page(viewer))).toBe('event_not_found');
      expect(codeOf(await byId(viewer))).toBe('event_not_found');
    }
    for (const viewer of [TEST_HOST_ID, ORGANISER_ID]) {
      expect(codeOf(await page(viewer))).toBe('ok');
      expect(codeOf(await byId(viewer))).toBe('ok');
    }
  });

  it('takes no RSVP, answering as if it did not exist, and queues no message', async () => {
    const draft = await draftMeetup(db, 'A draft nobody joins');

    const result = await createRsvpResolver(db, {
      eventId: draft.id,
      userId: STRANGER_ID,
    });

    expect(!result.ok && result.error.code).toBe('event_not_found');
    expect(
      await db
        .select()
        .from(eventRsvps)
        .where(eq(eventRsvps.userId, STRANGER_ID)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(scheduledNotifications)
        .where(eq(scheduledNotifications.eventId, draft.id)),
    ).toEqual([]);
  });
});
