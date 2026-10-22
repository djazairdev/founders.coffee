import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  events,
  hackathonJudges,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { TEST_HOST_ID } from '../events/resolver.fixtures.js';
import { hashSecretToken } from '../secret-tokens.js';
import {
  codeOf,
  DAY,
  hackathonWithDetails,
  ORGANISATION,
  setHackathons,
  setupHackathonDb,
} from './edit.fixtures.js';
import {
  answerJudgeInviteResolver,
  createJudgeInviteResolver,
  listJudgesResolver,
  removeJudgeResolver,
} from './judges.js';

let db: Db;

const JUDGE = 'usr_judge_one';
const OTHER = 'usr_judge_two';

beforeEach(async () => {
  db = await setupHackathonDb();
  await db
    .insert(user)
    .values(
      [JUDGE, OTHER].map((userId, index) => ({
        id: userId,
        name: `Judge ${index + 1}`,
        email: `${userId}@judges.test`,
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

const linkFor = async (eventId: string) => {
  const made = await createJudgeInviteResolver(db, organiser(eventId));
  if (!made.ok) throw made.error;
  return made.data;
};

const answer = (
  token: string,
  userId: string,
  reply: 'accept' | 'decline' = 'accept',
  now?: number,
) => answerJudgeInviteResolver(db, { token, answer: reply, userId }, now);

const placesOf = async (eventId: string) => {
  const listed = await listJudgesResolver(db, eventId);
  if (!listed.ok) throw listed.error;
  return listed.data.map(({ status, name }) => ({ status, name }));
};

describe('judge invite links (B-JDG-03, real D1)', () => {
  it('makes one link per judge, keeping only the token’s hash', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);

    const first = await linkFor(eventId);
    const second = await linkFor(eventId);

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second.token).not.toBe(first.token);
    const [row] = await db
      .select()
      .from(hackathonJudges)
      .where(eq(hackathonJudges.id, first.judgeId));
    expect(row).toMatchObject({
      eventId,
      status: 'invited',
      userId: null,
      invitedBy: TEST_HOST_ID,
      tokenHash: await hashSecretToken(first.token),
    });
    expect(await placesOf(eventId)).toEqual([
      { status: 'invited', name: null },
      { status: 'invited', name: null },
    ]);
  });

  it('lets a draft hackathon line its judges up before it is published', async () => {
    const { eventId } = await hackathonWithDetails(db);
    const { token } = await linkFor(eventId);

    expect(await answer(token, JUDGE)).toEqual({
      ok: true,
      data: { eventId, status: 'accepted' },
    });
  });

  it('makes the member who accepts a judge, and the link works once', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const { token } = await linkFor(eventId);

    expect((await answer(token, JUDGE)).ok).toBe(true);
    expect(await answer(token, JUDGE)).toEqual({
      ok: true,
      data: { eventId, status: 'accepted' },
    });
    expect(codeOf(await answer(token, OTHER))).toBe('judge_invite_invalid');
    expect(codeOf(await answer(token, JUDGE, 'decline'))).toBe(
      'judge_invite_invalid',
    );
    expect(await placesOf(eventId)).toEqual([
      { status: 'accepted', name: 'Judge 1' },
    ]);
  });

  it('refuses a second place to a member who already judges', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const first = await linkFor(eventId);
    const second = await linkFor(eventId);
    await answer(first.token, JUDGE);

    expect(codeOf(await answer(second.token, JUDGE))).toBe('already_judge');
    expect((await answer(second.token, OTHER)).ok).toBe(true);
  });

  it('records a decline without the member, who may still accept another link', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const first = await linkFor(eventId);
    const second = await linkFor(eventId);

    expect(await answer(first.token, JUDGE, 'decline')).toEqual({
      ok: true,
      data: { eventId, status: 'declined' },
    });
    expect(codeOf(await answer(first.token, JUDGE))).toBe(
      'judge_invite_invalid',
    );
    expect((await answer(second.token, JUDGE)).ok).toBe(true);
    expect(await placesOf(eventId)).toEqual([
      { status: 'declined', name: null },
      { status: 'accepted', name: 'Judge 1' },
    ]);
  });

  it('removes a link nobody answered and a judge who accepted', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const unanswered = await linkFor(eventId);
    const accepted = await linkFor(eventId);
    await answer(accepted.token, JUDGE);
    const remove = (judgeId: string) =>
      removeJudgeResolver(db, {
        eventId,
        judgeId,
        organisationId: ORGANISATION,
      });

    expect((await remove(unanswered.judgeId)).ok).toBe(true);
    expect((await remove(accepted.judgeId)).ok).toBe(true);
    expect(codeOf(await remove(accepted.judgeId))).toBe('judge_not_found');
    expect(codeOf(await answer(unanswered.token, OTHER))).toBe(
      'judge_invite_invalid',
    );
    const again = await linkFor(eventId);
    expect(codeOf(await answer(again.token, JUDGE))).toBe('judge_removed');
    expect(await placesOf(eventId)).toEqual([
      { status: 'invited', name: null },
    ]);
  });

  it('answers a link nobody made as one that no longer works', async () => {
    expect(codeOf(await answer('A'.repeat(43), JUDGE))).toBe(
      'judge_invite_invalid',
    );
  });

  it('stops every change once judging has ended', async () => {
    const { eventId, kickoff } = await hackathonWithDetails(db, {}, true);
    const { token, judgeId } = await linkFor(eventId);
    const after = kickoff + 10 * DAY;

    expect(
      codeOf(await createJudgeInviteResolver(db, organiser(eventId), after)),
    ).toBe('judging_closed');
    expect(codeOf(await answer(token, JUDGE, 'accept', after))).toBe(
      'judging_closed',
    );
    expect(
      codeOf(
        await removeJudgeResolver(
          db,
          { eventId, judgeId, organisationId: ORGANISATION },
          after,
        ),
      ),
    ).toBe('judging_closed');
  });

  it('stops every change for a cancelled hackathon, or with hackathons off', async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const { token } = await linkFor(eventId);

    await setHackathons(db, false);
    expect(codeOf(await answer(token, JUDGE))).toBe('hackathons_disabled');
    await setHackathons(db, true);
    await db
      .update(events)
      .set({ status: 'cancelled' })
      .where(eq(events.id, eventId));
    expect(codeOf(await answer(token, JUDGE))).toBe('hackathon_not_editable');
    expect(
      codeOf(await createJudgeInviteResolver(db, organiser(eventId))),
    ).toBe('hackathon_not_editable');
  });

  it(`holds a hackathon to ${hackathons.HACKATHON_JUDGE_LIMIT} open places`, async () => {
    const { eventId } = await hackathonWithDetails(db, {}, true);
    const made = [];
    for (let place = 0; place < hackathons.HACKATHON_JUDGE_LIMIT; place += 1)
      made.push(await linkFor(eventId));

    expect(
      codeOf(await createJudgeInviteResolver(db, organiser(eventId))),
    ).toBe('judge_limit_reached');
    const [first] = made;
    if (!first) throw new Error('no link');
    await answer(first.token, JUDGE, 'decline');
    expect((await createJudgeInviteResolver(db, organiser(eventId))).ok).toBe(
      true,
    );
  });
});
