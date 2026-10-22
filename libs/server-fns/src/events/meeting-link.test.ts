import { beforeEach, describe, expect, it } from 'vitest';

import { eq, events, getEvent, type Db, type Event } from '@founders-coffee/db';

import { answerEventCalendar } from './calendar.js';
import { readEventCard } from './card.js';
import { cancelEventResolver } from './cancel.js';
import { eventDetail } from './detail.js';
import { listHostedEventPage } from './hosted.js';
import { listJoinedEventPage } from './joined.js';
import { readEventPage } from './page.js';
import { readPublicEventFeed } from './public-feed.js';
import { attachAttendance } from './attendance.js';
import { listEvents } from './resolver.js';
import { coOrganise, organisation, signUp } from './organisers.fixtures.js';
import { setupDb, TEST_HOST_ID } from './resolver.fixtures.js';
import { GUEST_ID, hostAnEvent, inviteGuest } from './update.fixtures.js';

const LINK = 'https://meet.example.com/founders-online';
const STRANGER_ID = 'usr_link_stranger1';
const ORGANISER_ID = 'usr_link_organiser';
const OUTSIDER_ID = 'usr_link_outsider1';

/** An online meetup with a link, a member going, and an organisation organising it as co-host. */
const onlineMeetup = async (db: Db): Promise<Event> => {
  const created = await hostAnEvent(db);
  await inviteGuest(db, created);
  await db
    .update(events)
    .set({
      format: 'online',
      meetingUrl: LINK,
      venue: null,
      venueAddress: null,
      latitude: null,
      longitude: null,
    })
    .where(eq(events.id, created.id))
    .run();
  const event = await getEvent(db, created.id);
  if (!event) throw new Error('fixture event was not stored');
  await Promise.all(
    [STRANGER_ID, ORGANISER_ID, OUTSIDER_ID].map((id) => signUp(db, id)),
  );
  await organisation(db, 'org_link_cohost', ORGANISER_ID);
  await organisation(db, 'org_link_unrelated', OUTSIDER_ID);
  await coOrganise(db, event.id, 'org_link_cohost');
  return event;
};

const linkFor = async (db: Db, event: Event, viewerId?: string | null) =>
  (await eventDetail(db, event, viewerId)).meetingLink;

describe('who is given an event’s meeting link (real D1, B-EVT-11)', () => {
  let db: Db;
  let event: Event;

  beforeEach(async () => {
    db = await setupDb();
    event = await onlineMeetup(db);
  });

  it('gives it to the host, a member going and a member of an organising organisation', async () => {
    expect(await linkFor(db, event, TEST_HOST_ID)).toBe(LINK);
    expect(await linkFor(db, event, GUEST_ID)).toBe(LINK);
    expect(await linkFor(db, event, ORGANISER_ID)).toBe(LINK);
  });

  it('withholds it from a reader signed out, a stranger and a member of another organisation', async () => {
    expect(await linkFor(db, event, null)).toBeNull();
    expect(await linkFor(db, event, undefined)).toBeNull();
    expect(await linkFor(db, event, STRANGER_ID)).toBeNull();
    expect(await linkFor(db, event, OUTSIDER_ID)).toBeNull();
  });

  it('keeps it for the host alone once the event is cancelled', async () => {
    await cancelEventResolver(db, { eventId: event.id, actorId: TEST_HOST_ID });
    const cancelled = await getEvent(db, event.id);
    if (!cancelled) throw new Error('the event went missing');

    expect(await linkFor(db, cancelled, TEST_HOST_ID)).toBe(LINK);
    expect(await linkFor(db, cancelled, GUEST_ID)).toBeNull();
    expect(await linkFor(db, cancelled, ORGANISER_ID)).toBeNull();
  });

  it('answers the page with the reader’s own link, and none for a reader signed out', async () => {
    const page = (viewer?: string) =>
      readEventPage(
        db,
        { marketCode: event.marketCode, slug: event.slug },
        Promise.resolve(viewer),
      );

    const anonymous = await page();
    const going = await page(GUEST_ID);

    expect(anonymous.ok && anonymous.data.event.meetingLink).toBeNull();
    expect(JSON.stringify(anonymous)).not.toContain(LINK);
    expect(going.ok && going.data.event.meetingLink).toBe(LINK);
  });

  it('leaves it out of every public shape, even for a member going', async () => {
    const feed = await readPublicEventFeed(db, { limit: 50 });
    const upcoming = await attachAttendance(
      db,
      (await listEvents(db, { marketCode: event.marketCode, limit: 50 })).items,
      GUEST_ID,
    );
    const shapes = [
      feed,
      upcoming,
      await readEventCard(db, event.id),
      await answerEventCalendar(db, {
        id: event.id,
        locale: 'en',
        target: 'ics',
        origin: 'https://founders.coffee',
      }),
      await listHostedEventPage(db, { hostId: TEST_HOST_ID }),
      await listJoinedEventPage(db, { userId: GUEST_ID }),
    ];

    expect(feed.ok).toBe(true);
    expect(
      feed.ok && feed.data.items.find((item) => item.slug === event.slug),
      'an online event is listed, with no venue, since B-EVT-12',
    ).toMatchObject({ format: 'online', venue: null });
    expect(upcoming.map((item) => item.id)).toContain(event.id);
    for (const shape of shapes)
      expect(JSON.stringify(shape)).not.toContain(LINK);
  });

  it('puts it in the calendar entry of a reader it is for, and no one else’s (B-EVT-12)', async () => {
    const entry = async (viewerId?: string | null) => {
      const answer = await answerEventCalendar(db, {
        id: event.id,
        locale: 'en',
        target: 'ics',
        origin: 'https://founders.coffee',
        viewerId,
      });
      return answer?.kind === 'file' ? answer.body : '';
    };

    expect(await entry(GUEST_ID)).toContain(`LOCATION:${LINK}`);
    expect(await entry(TEST_HOST_ID)).toContain(LINK);
    expect(await entry(ORGANISER_ID)).toContain(LINK);
    expect(await entry(STRANGER_ID)).not.toContain(LINK);
    expect(await entry(null)).not.toContain(LINK);
  });
});
