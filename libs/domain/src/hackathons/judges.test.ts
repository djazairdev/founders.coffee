import { describe, expect, it } from 'vitest';

import {
  decideJudgeAnswer,
  decideJudgeChange,
  HACKATHON_JUDGE_LIMIT,
  hackathonJudgeAnswerSchema,
} from './judges.js';
import type { HackathonTimeline } from './timeline.js';

const timeline: HackathonTimeline = {
  registrationOpensAt: 1_000,
  registrationClosesAt: 2_000,
  kickoffAt: 3_000,
  submissionDeadlineAt: 4_000,
  endsAt: 4_500,
  judgingEndsAt: 5_000,
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

describe('decideJudgeChange (B-JDG-03)', () => {
  const change = (now: number, openPlaces?: number, isCancelled = false) =>
    decideJudgeChange({ timeline, now, isCancelled, openPlaces });

  it('lets organisers change judges from the draft until judging ends', () => {
    expect(change(0).ok).toBe(true);
    expect(change(4_999).ok).toBe(true);
    expect(codeOf(change(5_000))).toBe('judging_closed');
  });

  it('refuses a cancelled hackathon', () => {
    expect(codeOf(change(0, 0, true))).toBe('hackathon_not_editable');
  });

  it(`holds a hackathon to ${HACKATHON_JUDGE_LIMIT} open places`, () => {
    expect(change(0, HACKATHON_JUDGE_LIMIT - 1).ok).toBe(true);
    expect(codeOf(change(0, HACKATHON_JUDGE_LIMIT))).toBe(
      'judge_limit_reached',
    );
  });
});

describe('decideJudgeAnswer (B-JDG-03)', () => {
  const reply = (
    overrides: Partial<Parameters<typeof decideJudgeAnswer>[0]> = {},
  ) =>
    decideJudgeAnswer({
      invite: { status: 'invited', userId: null },
      answer: 'accept',
      userId: 'usr_judge',
      heldPlace: null,
      timeline,
      now: 3_500,
      isCancelled: false,
      ...overrides,
    });

  it('accepts or declines a link still waiting for an answer', () => {
    expect(reply()).toEqual({ ok: true, data: { isAlreadyAnswered: false } });
    expect(reply({ answer: 'decline' }).ok).toBe(true);
  });

  it('answers the member who accepted the link again as done', () => {
    expect(
      reply({ invite: { status: 'accepted', userId: 'usr_judge' } }),
    ).toEqual({ ok: true, data: { isAlreadyAnswered: true } });
  });

  it('refuses a link that was answered or removed', () => {
    for (const status of ['accepted', 'declined', 'removed'] as const)
      expect(codeOf(reply({ invite: { status, userId: 'usr_someone' } }))).toBe(
        'judge_invite_invalid',
      );
  });

  it('refuses a member who already holds a place to accept another', () => {
    expect(codeOf(reply({ heldPlace: 'accepted' }))).toBe('already_judge');
    expect(codeOf(reply({ heldPlace: 'removed' }))).toBe('judge_removed');
    expect(reply({ heldPlace: 'accepted', answer: 'decline' }).ok).toBe(true);
  });

  it('refuses once judging has ended or the hackathon was cancelled', () => {
    expect(codeOf(reply({ now: 5_000 }))).toBe('judging_closed');
    expect(codeOf(reply({ isCancelled: true }))).toBe('hackathon_not_editable');
  });

  it('takes only a link token and an answer', () => {
    const token = 'a'.repeat(43);
    expect(
      hackathonJudgeAnswerSchema.safeParse({ token, answer: 'accept' }).success,
    ).toBe(true);
    expect(
      hackathonJudgeAnswerSchema.safeParse({ token: 'short', answer: 'accept' })
        .success,
    ).toBe(false);
    expect(
      hackathonJudgeAnswerSchema.safeParse({ token, answer: 'maybe' }).success,
    ).toBe(false);
  });
});
