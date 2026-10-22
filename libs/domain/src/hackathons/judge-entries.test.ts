import { describe, expect, it } from 'vitest';

import { decideJudgeAccess, decideRecusal } from './judge-entries.js';

const HOUR = 3_600_000;
const deadline = Date.parse('2099-01-17T18:00:00Z');
const timeline = {
  registrationOpensAt: deadline - 20 * 24 * HOUR,
  registrationClosesAt: deadline - 3 * 24 * HOUR,
  kickoffAt: deadline - 48 * HOUR,
  submissionDeadlineAt: deadline,
  endsAt: deadline + 24 * HOUR,
  judgingEndsAt: deadline + 72 * HOUR,
};

const access = {
  timeline,
  now: deadline + HOUR,
  isCancelled: false,
  isResultsPublished: false,
  judge: 'accepted' as const,
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

describe('judges reading entries and recusing (B-JDG-04)', () => {
  it('opens the entries to an accepted judge from the deadline until judging ends', () => {
    expect(decideJudgeAccess(access).ok).toBe(true);
    expect(codeOf(decideJudgeAccess({ ...access, judge: 'invited' }))).toBe(
      'not_judge',
    );
    expect(codeOf(decideJudgeAccess({ ...access, judge: null }))).toBe(
      'not_judge',
    );
    expect(codeOf(decideJudgeAccess({ ...access, now: deadline - 1 }))).toBe(
      'judging_not_started',
    );
    expect(
      codeOf(decideJudgeAccess({ ...access, now: deadline + 72 * HOUR })),
    ).toBe('judging_closed');
    expect(
      codeOf(decideJudgeAccess({ ...access, isResultsPublished: true })),
    ).toBe('judging_closed');
    expect(codeOf(decideJudgeAccess({ ...access, isCancelled: true }))).toBe(
      'judging_closed',
    );
  });

  it('lets a judge recuse once from a submitted entry', () => {
    const recusal = {
      ...access,
      entry: 'submitted' as const,
      isRecused: false,
    };
    expect(decideRecusal(recusal).ok).toBe(true);
    expect(codeOf(decideRecusal({ ...recusal, isRecused: true }))).toBe(
      'already_recused',
    );
    expect(codeOf(decideRecusal({ ...recusal, entry: 'disqualified' }))).toBe(
      'submission_not_found',
    );
    expect(codeOf(decideRecusal({ ...recusal, entry: null }))).toBe(
      'submission_not_found',
    );
    expect(codeOf(decideRecusal({ ...recusal, judge: 'removed' }))).toBe(
      'not_judge',
    );
  });
});
