import { beforeEach, describe, expect, it } from 'vitest';

import { HACKATHON_TEAM_TEMPLATE_KEYS } from '@founders-coffee/core';
import {
  accountPreferences,
  and,
  eq,
  scheduledNotifications,
  user,
  type Db,
} from '@founders-coffee/db';

import { hackathonTeamMessage } from '../notifications/hackathon-team.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { leaveTeamResolver, removeTeamMemberResolver } from './team-changes.js';
import { createHackathonTeamResolver } from './team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
} from './team-invites.js';
import {
  answerTeamRequestResolver,
  requestToJoinTeamResolver,
} from './team-requests.js';

let db: Db;

const [captain, mate, asker] = members.map((member) => member.id) as [
  string,
  string,
  string,
];

const isTeamNotice = (key: string) =>
  (HACKATHON_TEAM_TEMPLATE_KEYS as readonly string[]).includes(key);

const noticesOf = async (eventId: string, userId: string) =>
  (
    await db
      .select()
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.eventId, eventId),
          eq(scheduledNotifications.userId, userId),
        ),
      )
  ).filter((notice) => isTeamNotice(notice.templateKey));

const keysOf = async (eventId: string, userId: string) =>
  (await noticesOf(eventId, userId)).map((notice) => notice.templateKey);

const unwrap = <T>(
  result: { ok: true; data: T } | { ok: false; error: Error },
) => {
  if (!result.ok) throw result.error;
  return result.data;
};

/** A hackathon with a captain's team, a teammate who joined by its link, and a member outside it. */
const withTeam = async () => {
  const eventId = await openHackathon(db, { teamMax: 4 });
  await db.update(user).set({ localePref: 'en' });
  for (const userId of [captain, mate, asker])
    unwrap(
      await registerForHackathonResolver(db, null, {
        eventId,
        userId,
        attendanceMode: 'in_person',
        isAgeAttested: false,
        isLookingForTeam: true,
        skills: null,
      }),
    );
  const { teamId } = unwrap(
    await createHackathonTeamResolver(db, null, {
      eventId,
      userId: captain,
      name: 'Byte Club',
      description: null,
      isLookingForMembers: true,
    }),
  );
  const { token } = unwrap(
    await createTeamInviteResolver(db, { eventId, userId: captain }),
  );
  unwrap(await joinTeamByInviteResolver(db, { token, userId: mate }));
  return { eventId, teamId };
};

const ask = async (eventId: string, teamId: string) =>
  unwrap(
    await requestToJoinTeamResolver(db, { eventId, teamId, userId: asker }),
  ).requestId;

describe('team notices (B-TEAM-09, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('tells the team someone joined by its link, but not the one who joined', async () => {
    const { eventId } = await withTeam();

    const [notice] = await noticesOf(eventId, captain);
    expect(notice).toMatchObject({
      templateKey: 'hackathon_team_joined',
      channel: 'push',
      fallbackChannel: 'email',
    });
    expect(notice?.payload).toMatchObject({
      pushTitle: 'Resolver Member 1 joined Byte Club',
      pushUrl: expect.stringMatching(
        new RegExp(`/en/hackathon/${eventId}/team$`, 'u'),
      ),
    });
    expect(await keysOf(eventId, mate)).toEqual([]);
  });

  it('tells the captain of a request, and the member and the team when it is accepted', async () => {
    const { eventId, teamId } = await withTeam();
    const requestId = await ask(eventId, teamId);

    const request = (await noticesOf(eventId, captain)).find(
      (notice) => notice.templateKey === 'hackathon_team_request',
    );
    expect(request?.payload).toMatchObject({
      pushTitle: 'Resolver Member 2 asks to join Byte Club',
    });
    expect(await keysOf(eventId, mate)).toEqual([]);

    const answered = await answerTeamRequestResolver(db, {
      eventId,
      userId: captain,
      requestId,
      decision: 'accept',
    });

    expect(answered).toEqual({ ok: true, data: { teamId } });
    expect(await keysOf(eventId, asker)).toEqual(['hackathon_team_accepted']);
    expect(await keysOf(eventId, mate)).toEqual(['hackathon_team_joined']);
    expect((await keysOf(eventId, captain)).sort()).toEqual([
      'hackathon_team_joined',
      'hackathon_team_request',
    ]);
  });

  it('tells a member their request was declined, pointing them to who is looking', async () => {
    const { eventId, teamId } = await withTeam();
    const requestId = await ask(eventId, teamId);

    unwrap(
      await answerTeamRequestResolver(db, {
        eventId,
        userId: captain,
        requestId,
        decision: 'decline',
      }),
    );

    const [notice] = await noticesOf(eventId, asker);
    expect(notice?.templateKey).toBe('hackathon_team_declined');
    expect(notice?.payload).toMatchObject({
      pushUrl: expect.stringMatching(
        new RegExp(`/en/hackathon/${eventId}/looking$`, 'u'),
      ),
    });
  });

  it('tells the rest of the team a member left or was removed, but not the captain who removed them', async () => {
    const { eventId, teamId } = await withTeam();
    unwrap(
      await answerTeamRequestResolver(db, {
        eventId,
        userId: captain,
        requestId: await ask(eventId, teamId),
        decision: 'accept',
      }),
    );

    unwrap(await leaveTeamResolver(db, { eventId, userId: mate }));
    const left = (await noticesOf(eventId, captain)).find(
      (notice) => notice.templateKey === 'hackathon_team_left',
    );
    expect(left?.payload).toMatchObject({
      pushTitle: 'Resolver Member 1 is no longer in Byte Club',
    });
    expect(await keysOf(eventId, asker)).toContain('hackathon_team_left');

    unwrap(
      await removeTeamMemberResolver(db, {
        eventId,
        userId: captain,
        memberId: asker,
      }),
    );
    expect(
      (await keysOf(eventId, captain)).filter(
        (key) => key === 'hackathon_team_left',
      ),
    ).toHaveLength(1);
  });

  it('tells nobody when the last member leaves and the team is gone', async () => {
    const eventId = await openHackathon(db);
    unwrap(
      await registerForHackathonResolver(db, null, {
        eventId,
        userId: captain,
        attendanceMode: 'in_person',
        isAgeAttested: false,
        isLookingForTeam: false,
        skills: null,
      }),
    );
    unwrap(
      await createHackathonTeamResolver(db, null, {
        eventId,
        userId: captain,
        name: 'Solo',
        description: null,
        isLookingForMembers: false,
      }),
    );

    expect(
      unwrap(await leaveTeamResolver(db, { eventId, userId: captain })),
    ).toEqual({ isTeamDeleted: true });
    expect(await keysOf(eventId, captain)).toEqual([]);
  });

  it('writes in the reader’s language and sends nothing to one who turned the Hackathons notices off', async () => {
    const eventId = await openHackathon(db, { teamMax: 4 });
    await db.update(user).set({ localePref: 'ar' }).where(eq(user.id, captain));
    await db
      .insert(accountPreferences)
      .values({ userId: asker, hackathons: false, hackathonsChannels: 0 });
    for (const userId of [captain, mate, asker])
      unwrap(
        await registerForHackathonResolver(db, null, {
          eventId,
          userId,
          attendanceMode: 'in_person',
          isAgeAttested: false,
          isLookingForTeam: true,
          skills: null,
        }),
      );
    const { teamId } = unwrap(
      await createHackathonTeamResolver(db, null, {
        eventId,
        userId: captain,
        name: 'Byte Club',
        description: null,
        isLookingForMembers: true,
      }),
    );
    const requestId = await ask(eventId, teamId);

    const [request] = await noticesOf(eventId, captain);
    expect(request?.payload).toMatchObject({
      locale: 'ar',
      pushTitle: 'Resolver Member 2 يطلب الانضمام إلى Byte Club',
      pushUrl: expect.stringMatching(
        new RegExp(`/ar/hackathon/${eventId}/team$`, 'u'),
      ),
    });

    unwrap(
      await answerTeamRequestResolver(db, {
        eventId,
        userId: captain,
        requestId,
        decision: 'decline',
      }),
    );
    expect(await keysOf(eventId, asker)).toEqual([]);
  });

  it('escapes what members typed in the email’s HTML only', async () => {
    const message = await hackathonTeamMessage(
      'hackathon_team_joined',
      {
        title: 'Build <Algiers>',
        team: '<b>Byte</b>',
        name: 'Amina & co',
        url: 'https://founders.coffee/en/hackathon/evt_1/team',
      },
      'en',
    );

    expect(message.pushTitle).toBe('Amina & co joined <b>Byte</b>');
    expect(message.html).toContain('&lt;b&gt;Byte&lt;/b&gt;');
    expect(message.html).toContain('Amina &amp; co');
    expect(message.html).not.toContain('<b>Byte</b>');
    expect(message.text).toContain('Amina & co joined <b>Byte</b>');
  });
});
