import { describe, expect, it } from 'vitest';

import {
  judgeEntryState,
  judgeProgressOf,
  judgingStageAt,
} from './judge-progress.js';
import type { HackathonTimeline } from './timeline.js';

const at = (iso: string) => Date.parse(iso);

const TIMELINE: HackathonTimeline = {
  registrationOpensAt: at('2027-01-04T09:00:00Z'),
  registrationClosesAt: at('2027-01-20T23:00:00Z'),
  kickoffAt: at('2027-01-22T17:00:00Z'),
  submissionDeadlineAt: at('2027-01-29T21:00:00Z'),
  endsAt: at('2027-01-30T19:00:00Z'),
  judgingEndsAt: at('2027-02-06T21:00:00Z'),
};

const stageAt = (iso: string, flags: Partial<Record<string, boolean>> = {}) =>
  judgingStageAt({
    timeline: TIMELINE,
    now: at(iso),
    isCancelled: flags['isCancelled'] ?? false,
    isResultsPublished: flags['isResultsPublished'] ?? false,
  });

describe('judging stage', () => {
  it('opens at the submission deadline and closes when judging ends', () => {
    expect(stageAt('2027-01-29T20:59:59Z')).toBe('not_started');
    expect(stageAt('2027-01-29T21:00:00Z')).toBe('judging');
    expect(stageAt('2027-02-06T20:59:59Z')).toBe('judging');
    expect(stageAt('2027-02-06T21:00:00Z')).toBe('closed');
  });

  it('closes early once the results are published or the hackathon is cancelled', () => {
    expect(stageAt('2027-02-01T12:00:00Z', { isResultsPublished: true })).toBe(
      'closed',
    );
    expect(stageAt('2027-01-25T12:00:00Z', { isCancelled: true })).toBe(
      'closed',
    );
  });
});

describe('a judge’s entries and progress (B-JDG-06)', () => {
  it('counts an entry as scored only once every criterion has a score', () => {
    const state = (scoredCount: number, isRecused = false) =>
      judgeEntryState({ isRecused, scoredCount, criteriaCount: 3 });
    expect(state(0)).toBe('to_score');
    expect(state(2)).toBe('to_score');
    expect(state(3)).toBe('scored');
    expect(state(3, true)).toBe('recused');
    expect(
      judgeEntryState({ isRecused: false, scoredCount: 0, criteriaCount: 0 }),
    ).toBe('to_score');
  });

  it('counts the entries by where each stands', () => {
    expect(
      judgeProgressOf(['scored', 'to_score', 'recused', 'scored']),
    ).toEqual({ scored: 2, toScore: 1, recused: 1 });
    expect(judgeProgressOf([])).toEqual({ scored: 0, toScore: 0, recused: 0 });
  });
});
