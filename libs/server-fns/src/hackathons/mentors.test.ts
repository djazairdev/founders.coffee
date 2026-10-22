import { beforeEach, describe, expect, it } from 'vitest';

import { user, type Db } from '@founders-coffee/db';

import { TEST_HOST_ID } from '../events/resolver.fixtures.js';
import {
  codeOf,
  DAY,
  hackathonWithDetails,
  ORGANISATION,
  setupHackathonDb,
} from './edit.fixtures.js';
import {
  answerJudgeInviteResolver,
  createJudgeInviteResolver,
} from './judges.js';
import {
  answerMentorInviteResolver,
  createMentorInviteResolver,
  listMentorsResolver,
  removeMentorResolver,
  saveMentorNoteResolver,
} from './mentors.js';

let db: Db;

const MENTOR = 'usr_mentor_one';
const OTHER = 'usr_mentor_two';

const NOTE = { helpsWith: 'Pitching and fundraising', officeHours: null };

beforeEach(async () => {
  db = await setupHackathonDb();
  await db
    .insert(user)
    .values(
      [MENTOR, OTHER].map((userId, index) => ({
        id: userId,
        name: `Mentor ${index + 1}`,
        email: `${userId}@mentors.test`,
        emailVerified: true,
        role: 'member' as const,
      })),
    )
    .onConflictDoNothing();
});

const organiser = (eventId: string) => ({
  eventId,
  userId: TEST_HOST_ID,
  organisationId: ORGANISATION,
});

const mentorLink = async (eventId: string) => {
  const made = await createMentorInviteResolver(db, organiser(eventId));
  if (!made.ok) throw made.error;
  return made.data;
};

const judgeLink = async (eventId: string) => {
  const made = await createJudgeInviteResolver(db, organiser(eventId));
  if (!made.ok) throw made.error;
  return made.data.token;
};

const accept = (token: string, userId: string, now?: number) =>
  answerMentorInviteResolver(
    db,
    { token, answer: 'accept', note: NOTE, userId },
    now,
  );

const mentorsOf = async (eventId: string) => {
  const listed = await listMentorsResolver(db, eventId);
  if (!listed.ok) throw listed.error;
  return listed.data.map(({ status, name, helpsWith, officeHours }) => ({
    status,
    name,
    helpsWith,
    officeHours,
  }));
};

describe('mentors (B-HKN-25, real D1)', () => {
  it('invites a mentor by a link, who accepts with what they help with', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const { token, mentorId } = await mentorLink(eventId);

    expect(mentorId).toMatch(/^mnt_/);
    expect(await accept(token, MENTOR)).toEqual({
      ok: true,
      data: { eventId, status: 'accepted' },
    });
    expect(await accept(token, MENTOR)).toEqual({
      ok: true,
      data: { eventId, status: 'accepted' },
    });
    expect(codeOf(await accept(token, OTHER))).toBe('mentor_invite_invalid');
    expect(await mentorsOf(eventId)).toEqual([
      {
        status: 'accepted',
        name: 'Mentor 1',
        helpsWith: 'Pitching and fundraising',
        officeHours: null,
      },
    ]);
  });

  it('records a decline without the member or a note', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const { token } = await mentorLink(eventId);

    expect(
      await answerMentorInviteResolver(db, {
        token,
        answer: 'decline',
        userId: MENTOR,
      }),
    ).toEqual({ ok: true, data: { eventId, status: 'declined' } });
    expect(await mentorsOf(eventId)).toEqual([
      { status: 'declined', name: null, helpsWith: null, officeHours: null },
    ]);
  });

  it('never lets a mentor judge the same hackathon, or a judge mentor it', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const mentoring = await mentorLink(eventId);
    await accept(mentoring.token, MENTOR);
    const judgeToken = await judgeLink(eventId);
    await answerJudgeInviteResolver(db, {
      token: judgeToken,
      answer: 'accept',
      userId: OTHER,
    });

    expect(
      codeOf(
        await answerJudgeInviteResolver(db, {
          token: await judgeLink(eventId),
          answer: 'accept',
          userId: MENTOR,
        }),
      ),
    ).toBe('already_mentor');
    const second = await mentorLink(eventId);
    expect(codeOf(await accept(second.token, OTHER))).toBe('already_judge');
    expect(codeOf(await accept(second.token, MENTOR))).toBe('already_mentor');
  });

  it('lets the mentor change their note, and nobody else', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const { token } = await mentorLink(eventId);
    await accept(token, MENTOR);
    const save = (userId: string, now?: number) =>
      saveMentorNoteResolver(
        db,
        {
          eventId,
          userId,
          note: {
            helpsWith: 'Product and design',
            officeHours: 'Wednesdays 18:00–20:00 in the chat',
          },
        },
        now,
      );

    expect((await save(MENTOR)).ok).toBe(true);
    expect(codeOf(await save(OTHER))).toBe('not_mentor');
    expect(await mentorsOf(eventId)).toEqual([
      {
        status: 'accepted',
        name: 'Mentor 1',
        helpsWith: 'Product and design',
        officeHours: 'Wednesdays 18:00–20:00 in the chat',
      },
    ]);
  });

  it('removes a mentor, whose link and note then stop working', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const { token, mentorId } = await mentorLink(eventId);
    await accept(token, MENTOR);

    expect(
      await removeMentorResolver(db, {
        eventId,
        mentorId,
        organisationId: ORGANISATION,
      }),
    ).toEqual({ ok: true, data: { mentorId } });
    expect(
      codeOf(
        await saveMentorNoteResolver(db, {
          eventId,
          userId: MENTOR,
          note: NOTE,
        }),
      ),
    ).toBe('not_mentor');
    const again = await mentorLink(eventId);
    expect(codeOf(await accept(again.token, MENTOR))).toBe('mentor_removed');
    expect(await mentorsOf(eventId)).toEqual([
      { status: 'invited', name: null, helpsWith: null, officeHours: null },
    ]);
  });

  it('stops every change once judging has ended', async () => {
    const { eventId, kickoff } = await hackathonWithDetails(db, {}, true);
    const { token, mentorId } = await mentorLink(eventId);
    const after = kickoff + 10 * DAY;

    expect(
      codeOf(await createMentorInviteResolver(db, organiser(eventId), after)),
    ).toBe('judging_closed');
    expect(codeOf(await accept(token, MENTOR, after))).toBe('judging_closed');
    expect(
      codeOf(
        await removeMentorResolver(
          db,
          { eventId, mentorId, organisationId: ORGANISATION },
          after,
        ),
      ),
    ).toBe('judging_closed');
  });
});
