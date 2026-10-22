import { eq, sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';

import { batch } from './atomic.js';
import {
  CHAT_KEPT_AFTER_MEETUP_SECONDS,
  CHAT_OPEN_AFTER_RESULTS_SECONDS,
  getChatChannel,
  syncChatChannel,
} from './chat-channels.js';
import { sendChatMessage } from './chat-messages.js';
import { newMember, unreadNotice } from './chat.fixtures.js';
import type { Db } from './db.js';
import { createEventIfRouteAvailable } from './events-publish.js';
import { hackathonDetails, hackathonEventRow } from './hackathons.fixtures.js';
import { insertHackathonDetails } from './hackathons.js';
import { HOST_ID, setupDb } from './rsvps.fixtures.js';
import {
  accountPreferences,
  eventOrganisers,
  events,
  hackathonJudges,
  hackathonMentors,
  hackathonRegistrations,
  hackathons,
  member,
  organization,
  scheduledNotifications,
} from './schema.js';

const send = (db: Db, eventId: string, authorId: string) =>
  sendChatMessage(db, {
    eventId,
    authorId,
    body: 'Salam',
    clientId: crypto.randomUUID(),
    unread: unreadNotice(),
  });

/** A published hackathon by `HOST_ID`, with its chat and its details saved the way an organiser saves them. */
const publishHackathon = async (db: Db): Promise<string> => {
  const row = {
    ...hackathonEventRow(),
    hostId: HOST_ID,
    status: 'published' as const,
  };
  const created = await createEventIfRouteAvailable(db, row);
  if (!created) throw new Error(`hackathon ${row.slug} was not published`);
  await batch(db, [
    insertHackathonDetails(db, { eventId: row.id, details: hackathonDetails }),
    syncChatChannel(db, row.id),
  ]);
  return row.id;
};

const register = (
  db: Db,
  eventId: string,
  userId: string,
  status: 'registered' | 'waitlisted' | 'withdrawn' | 'disqualified',
) =>
  db.insert(hackathonRegistrations).values({
    id: id('reg'),
    eventId,
    userId,
    status,
    attendanceMode: 'online',
    codeOfConductAcceptedAt: new Date(),
  });

type PlaceStatus = 'invited' | 'accepted' | 'declined';

const placeOf = (eventId: string, userId: string, status: PlaceStatus) => ({
  id: id('plc'),
  eventId,
  userId,
  status,
  tokenHash: id('tkh'),
  invitedBy: HOST_ID,
});

const judge = (db: Db, eventId: string, userId: string, status: PlaceStatus) =>
  db.insert(hackathonJudges).values(placeOf(eventId, userId, status));

const mentor = (db: Db, eventId: string, userId: string, status: PlaceStatus) =>
  db
    .insert(hackathonMentors)
    .values({ ...placeOf(eventId, userId, status), helpsWith: 'Pitching' });

/** Move when the hackathon's results count from, and its chat with it, the way a write would. */
const resultsAt = async (
  db: Db,
  eventId: string,
  set: Partial<typeof hackathons.$inferInsert>,
) => {
  await batch(db, [
    db.update(hackathons).set(set).where(eq(hackathons.eventId, eventId)),
    syncChatChannel(db, eventId),
  ]);
};

const secondsOf = (date: Date | undefined) =>
  date ? Math.floor(date.getTime() / 1000) : null;

describe('a hackathon’s chat: who is in it (B-HKN-22, real D1)', () => {
  let db: Db;
  let eventId: string;
  const people: Record<string, string> = {};

  beforeAll(async () => {
    db = await setupDb();
    eventId = await publishHackathon(db);
    for (const name of [
      'organiser',
      'registered',
      'waitlisted',
      'withdrawn',
      'disqualified',
      'judge',
      'invitedJudge',
      'mentor',
      'declinedMentor',
      'stranger',
    ])
      people[name] = await newMember(db);
    const organisationId = id('org');
    await db.insert(organization).values({
      id: organisationId,
      name: 'Chat club',
      slug: `chat-club-${organisationId}`,
      kind: 'club',
      status: 'approved',
      marketCode: 'DZ',
      description: 'A club that runs a hackathon.',
    });
    await db.insert(member).values({
      id: id('mem'),
      organizationId: organisationId,
      userId: people.organiser,
      role: 'member',
    });
    await db
      .insert(eventOrganisers)
      .values({ eventId, organisationId, role: 'lead' });
    await register(db, eventId, people.registered, 'registered');
    await register(db, eventId, people.waitlisted, 'waitlisted');
    await register(db, eventId, people.withdrawn, 'withdrawn');
    await register(db, eventId, people.disqualified, 'disqualified');
    await judge(db, eventId, people.judge, 'accepted');
    await judge(db, eventId, people.invitedJudge, 'invited');
    await mentor(db, eventId, people.mentor, 'accepted');
    await mentor(db, eventId, people.declinedMentor, 'declined');
  });

  it('takes messages from its organisers, registered participants, and judges and mentors who accepted', async () => {
    for (const name of ['organiser', 'registered', 'judge', 'mentor'])
      expect((await send(db, eventId, people[name])).outcome, name).toBe(
        'sent',
      );
    expect((await send(db, eventId, HOST_ID)).outcome).toBe('sent');
  });

  it('refuses the waitlist, those who left or were disqualified, and judges and mentors who did not accept', async () => {
    for (const name of [
      'waitlisted',
      'withdrawn',
      'disqualified',
      'invitedJudge',
      'declinedMentor',
      'stranger',
    ])
      expect((await send(db, eventId, people[name])).outcome, name).toBe(
        'not_member',
      );
  });

  it('queues the unread push for a participant who has push on', async () => {
    await db.insert(accountPreferences).values({
      userId: people.mentor,
      pushEnabled: true,
      meetupChatChannels: 1,
      meetupChat: true,
    });
    await send(db, eventId, people.registered);

    const pushes = await db
      .select({ userId: scheduledNotifications.userId })
      .from(scheduledNotifications)
      .where(
        sql`${scheduledNotifications.eventId} = ${eventId} and ${scheduledNotifications.templateKey} = 'chat_unread'`,
      );
    expect(pushes.map((push) => push.userId)).toEqual([people.mentor]);
  });
});

describe('a hackathon’s chat: how long it stays open (B-HKN-22, real D1)', () => {
  let db: Db;

  beforeAll(async () => {
    db = await setupDb();
  });

  it('counts 30 days from the end of judging until results are published, then from them', async () => {
    const eventId = await publishHackathon(db);
    const judgingEnds = secondsOf(hackathonDetails.judgingEndsAt) ?? 0;
    const before = await getChatChannel(db, eventId);
    expect(secondsOf(before?.readOnlyAt)).toBe(
      judgingEnds + CHAT_OPEN_AFTER_RESULTS_SECONDS,
    );
    expect(secondsOf(before?.expiresAt)).toBe(
      judgingEnds + CHAT_KEPT_AFTER_MEETUP_SECONDS,
    );

    const results = judgingEnds + 3 * 24 * 60 * 60;
    await resultsAt(db, eventId, {
      resultsPublishedAt: new Date(results * 1000),
    });
    const after = await getChatChannel(db, eventId);
    expect(secondsOf(after?.readOnlyAt)).toBe(
      results + CHAT_OPEN_AFTER_RESULTS_SECONDS,
    );
    expect(secondsOf(after?.expiresAt)).toBe(
      results + CHAT_KEPT_AFTER_MEETUP_SECONDS,
    );
  });

  it('takes a message until 30 days after results, and none from then on', async () => {
    const eventId = await publishHackathon(db);
    const now = Math.floor(Date.now() / 1000);

    await resultsAt(db, eventId, {
      resultsPublishedAt: new Date(
        (now - CHAT_OPEN_AFTER_RESULTS_SECONDS + 60) * 1000,
      ),
    });
    expect((await send(db, eventId, HOST_ID)).outcome).toBe('sent');

    await resultsAt(db, eventId, {
      resultsPublishedAt: new Date(
        (now - CHAT_OPEN_AFTER_RESULTS_SECONDS) * 1000,
      ),
    });
    expect((await send(db, eventId, HOST_ID)).outcome).toBe('read_only');
  });

  it('goes read-only the moment the hackathon is cancelled', async () => {
    const eventId = await publishHackathon(db);
    await batch(db, [
      db
        .update(events)
        .set({ status: 'cancelled', cancelledAt: new Date() })
        .where(eq(events.id, eventId)),
      syncChatChannel(db, eventId),
    ]);

    expect((await send(db, eventId, HOST_ID)).outcome).toBe('read_only');
  });
});
