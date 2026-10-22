import { describe, expect, it } from 'vitest';

import { hackathonJudgeAnswerSchema } from './judges.js';
import {
  decideMentorNote,
  hackathonMentorAnswerSchema,
  hackathonMentorNoteSchema,
} from './mentors.js';
import {
  decidePlaceAnswer,
  decidePlaceChange,
  HACKATHON_PLACE_LIMIT,
  type PlaceRole,
} from './places.js';
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

describe('decidePlaceChange (B-JDG-03, B-HKN-25)', () => {
  const change = (
    role: PlaceRole,
    now: number,
    openPlaces?: number,
    isCancelled = false,
  ) => decidePlaceChange(role, { timeline, now, isCancelled, openPlaces });

  it('lets organisers change places from the draft until judging ends', () => {
    expect(change('judge', 0).ok).toBe(true);
    expect(change('mentor', 4_999).ok).toBe(true);
    expect(codeOf(change('judge', 5_000))).toBe('judging_closed');
    expect(codeOf(change('mentor', 5_000))).toBe('judging_closed');
  });

  it('refuses a cancelled hackathon', () => {
    expect(codeOf(change('judge', 0, 0, true))).toBe('hackathon_not_editable');
  });

  it(`holds each role to ${HACKATHON_PLACE_LIMIT} open places`, () => {
    expect(change('judge', 0, HACKATHON_PLACE_LIMIT - 1).ok).toBe(true);
    expect(codeOf(change('judge', 0, HACKATHON_PLACE_LIMIT))).toBe(
      'judge_limit_reached',
    );
    expect(codeOf(change('mentor', 0, HACKATHON_PLACE_LIMIT))).toBe(
      'mentor_limit_reached',
    );
  });
});

describe('decidePlaceAnswer (B-JDG-03, B-HKN-25)', () => {
  const reply = (
    role: PlaceRole,
    overrides: Partial<Parameters<typeof decidePlaceAnswer>[1]> = {},
  ) =>
    decidePlaceAnswer(role, {
      invite: { status: 'invited', userId: null },
      answer: 'accept',
      userId: 'usr_member',
      heldPlace: null,
      holdsOtherRole: false,
      timeline,
      now: 3_500,
      isCancelled: false,
      ...overrides,
    });

  it('accepts or declines a link still waiting for an answer', () => {
    expect(reply('judge')).toEqual({
      ok: true,
      data: { isAlreadyAnswered: false },
    });
    expect(reply('mentor', { answer: 'decline' }).ok).toBe(true);
  });

  it('answers the member who accepted the link again as done', () => {
    expect(
      reply('judge', { invite: { status: 'accepted', userId: 'usr_member' } }),
    ).toEqual({ ok: true, data: { isAlreadyAnswered: true } });
  });

  it('refuses a link that was answered or removed', () => {
    for (const status of ['accepted', 'declined', 'removed'] as const) {
      const invite = { status, userId: 'usr_someone' };
      expect(codeOf(reply('judge', { invite }))).toBe('judge_invite_invalid');
      expect(codeOf(reply('mentor', { invite }))).toBe('mentor_invite_invalid');
    }
  });

  it('refuses a second place of the same role', () => {
    expect(codeOf(reply('judge', { heldPlace: 'accepted' }))).toBe(
      'already_judge',
    );
    expect(codeOf(reply('mentor', { heldPlace: 'removed' }))).toBe(
      'mentor_removed',
    );
    expect(
      reply('judge', { heldPlace: 'accepted', answer: 'decline' }).ok,
    ).toBe(true);
  });

  it('never lets a mentor judge the same hackathon, or a judge mentor it', () => {
    expect(codeOf(reply('judge', { holdsOtherRole: true }))).toBe(
      'already_mentor',
    );
    expect(codeOf(reply('mentor', { holdsOtherRole: true }))).toBe(
      'already_judge',
    );
    expect(
      reply('mentor', { holdsOtherRole: true, answer: 'decline' }).ok,
    ).toBe(true);
  });

  it('refuses once judging has ended or the hackathon was cancelled', () => {
    expect(codeOf(reply('judge', { now: 5_000 }))).toBe('judging_closed');
    expect(codeOf(reply('mentor', { isCancelled: true }))).toBe(
      'hackathon_not_editable',
    );
  });
});

describe('mentor notes (B-HKN-25)', () => {
  it('takes a short line on what the mentor helps with, office hours optional', () => {
    expect(
      hackathonMentorNoteSchema.parse({
        helpsWith: '  Pitching and fundraising  ',
        officeHours: '',
      }),
    ).toEqual({ helpsWith: 'Pitching and fundraising', officeHours: null });
    expect(
      hackathonMentorNoteSchema.safeParse({
        helpsWith: 'ab',
        officeHours: null,
      }).success,
    ).toBe(false);
    expect(
      hackathonMentorNoteSchema.safeParse({
        helpsWith: 'x'.repeat(161),
        officeHours: null,
      }).success,
    ).toBe(false);
    expect(
      hackathonMentorNoteSchema.safeParse({
        helpsWith: 'Product',
        officeHours: 'x'.repeat(301),
      }).success,
    ).toBe(false);
  });

  it('asks for the note to accept a mentor’s link, not to decline it', () => {
    const token = 'a'.repeat(43);
    expect(
      hackathonMentorAnswerSchema.safeParse({ token, answer: 'accept' })
        .success,
    ).toBe(false);
    expect(
      hackathonMentorAnswerSchema.safeParse({ token, answer: 'decline' })
        .success,
    ).toBe(true);
    expect(
      hackathonJudgeAnswerSchema.safeParse({ token: 'short', answer: 'accept' })
        .success,
    ).toBe(false);
  });

  it('lets only an accepted mentor change their note, until judging ends', () => {
    const note = (heldPlace: 'accepted' | 'invited' | null, now = 3_500) =>
      decideMentorNote({ timeline, now, isCancelled: false, heldPlace });
    expect(note('accepted').ok).toBe(true);
    expect(codeOf(note(null))).toBe('not_mentor');
    expect(codeOf(note('accepted', 5_000))).toBe('judging_closed');
  });
});
