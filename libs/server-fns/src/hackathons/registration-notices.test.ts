import { beforeEach, describe, expect, it } from 'vitest';

import { HACKATHON_REGISTRATION_TEMPLATE_KEYS } from '@founders-coffee/core';
import {
  accountPreferences,
  and,
  eq,
  scheduledNotifications,
  user,
  type Db,
} from '@founders-coffee/db';

import { hackathonRegistrationMessage } from '../notifications/hackathon-registration.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { withdrawFromHackathonResolver } from './withdrawal.js';

let db: Db;

const isRegistrationNotice = (key: string) =>
  (HACKATHON_REGISTRATION_TEMPLATE_KEYS as readonly string[]).includes(key);

const register = (eventId: string, userId: string) =>
  registerForHackathonResolver(db, null, {
    eventId,
    userId,
    attendanceMode: 'in_person',
    isAgeAttested: false,
    isLookingForTeam: false,
    skills: null,
  });

const noticesOf = (eventId: string, userId: string) =>
  db
    .select()
    .from(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.eventId, eventId),
        eq(scheduledNotifications.userId, userId),
      ),
    );

const [first, second] = members.map((member) => member.id) as [string, string];

const values = {
  title: 'Build <Algiers>',
  venue: 'Café Atlas',
  where: 'at Café Atlas',
  isOnline: false,
  address: 'Café Atlas',
  date: 'Saturday, Jan 16, 09:00',
  url: 'https://founders.coffee/en/dz/events/build',
};

describe('registration notices (B-REG-07, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('tells a member they are registered, by push with email behind it', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });
    await db.update(user).set({ localePref: 'en' }).where(eq(user.id, first));
    await register(eventId, first);

    const [notice] = await noticesOf(eventId, first);
    expect(notice).toMatchObject({
      templateKey: 'hackathon_registered',
      channel: 'push',
      fallbackChannel: 'email',
      status: 'pending',
    });
    expect(notice?.payload).toMatchObject({
      email: members[0]?.email,
      pushTitle: expect.stringContaining('registered'),
      subject: expect.stringContaining('registered'),
      pushUrl: expect.stringMatching(/\/en\/algeria\/e\/resolver-rsvp-/u),
    });
  });

  it('tells a member they are on the waitlist, then that a place is theirs', async () => {
    const eventId = await openHackathon(db, { capacity: 1 });
    await register(eventId, first);
    await register(eventId, second);

    expect(
      (await noticesOf(eventId, second)).map((notice) => notice.templateKey),
    ).toEqual(['hackathon_waitlisted']);

    await withdrawFromHackathonResolver(db, null, { eventId, userId: first });

    expect(
      (await noticesOf(eventId, second))
        .map((notice) => notice.templateKey)
        .filter((key) => isRegistrationNotice(key))
        .sort(),
    ).toEqual(['hackathon_promoted', 'hackathon_waitlisted']);
  });

  it('writes in the member’s own language', async () => {
    const eventId = await openHackathon(db);
    await db.update(user).set({ localePref: 'ar' }).where(eq(user.id, first));
    await register(eventId, first);

    const [notice] = await noticesOf(eventId, first);
    expect(notice?.payload).toMatchObject({
      locale: 'ar',
      pushTitle: expect.stringContaining('تم تسجيلك'),
    });
  });

  it('sends nothing to a member who turned the Hackathons notices off', async () => {
    const eventId = await openHackathon(db);
    await db
      .insert(accountPreferences)
      .values({ userId: first, hackathons: false, hackathonsChannels: 0 });
    await register(eventId, first);

    expect(await noticesOf(eventId, first)).toEqual([]);
  });
});

describe('registration notice messages (B-REG-07)', () => {
  it.each([
    ['hackathon_registered', 'en', "You're registered for Build <Algiers>"],
    [
      'hackathon_waitlisted',
      'fr',
      'Vous êtes sur la liste d’attente du hackathon « Build <Algiers> »',
    ],
    ['hackathon_promoted', 'ar', 'توفّر مكان: أنت مشارك في Build <Algiers>'],
  ] as const)('words %s in %s', async (templateKey, locale, pushTitle) => {
    const message = await hackathonRegistrationMessage(
      templateKey,
      values,
      locale,
    );

    expect(message.pushTitle).toBe(pushTitle);
    expect(message.pushUrl).toBe(values.url);
    expect(message.html).toContain('Build &lt;Algiers&gt;');
    expect(message.html).not.toContain('<Algiers>');
    expect(message.text).toContain('Build <Algiers>');
  });
});
