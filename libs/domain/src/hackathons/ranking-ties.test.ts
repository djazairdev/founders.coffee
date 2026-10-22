import { describe, expect, it } from 'vitest';

import { criteria, entry, marks, summary } from './ranking.fixtures.js';
import { rankEntries } from './ranking.js';

describe('ranking hackathon entries and breaking ties (B-JDG-02)', () => {
  it('breaks a tied total on the heaviest criterion', () => {
    const ranked = rankEntries({
      criteria,
      entries: [entry('builder'), entry('visionary')],
      scores: [
        ...marks('builder', 'j1', [8, 5, 4, 2]),
        ...marks('visionary', 'j1', [10, 3, 5, 2]),
      ],
      recusals: [],
    });

    expect(summary(ranked)).toEqual([
      {
        entryId: 'visionary',
        total: 80,
        rank: 1,
        trackRank: null,
        isTieUnresolved: false,
      },
      {
        entryId: 'builder',
        total: 80,
        rank: 2,
        trackRank: null,
        isTieUnresolved: false,
      },
    ]);
  });

  it('then on the higher single criterion, as a share of its scale', () => {
    const ranked = rankEntries({
      criteria,
      entries: [entry('even'), entry('peak')],
      scores: [
        ...marks('even', 'j1', [5, 4, 3, 4]),
        ...marks('peak', 'j1', [5, 5, 2, 2]),
      ],
      recusals: [],
    });

    expect(ranked.map(({ entryId, total }) => [entryId, total])).toEqual([
      ['peak', 60],
      ['even', 60],
    ]);
    expect(ranked.map(({ rank }) => rank)).toEqual([1, 2]);
  });

  it('marks a tie the rule cannot break for the organiser, sharing the rank and skipping the next', () => {
    const ranked = rankEntries({
      criteria,
      entries: [
        entry('first'),
        entry('second'),
        entry('third'),
        entry('fourth'),
      ],
      scores: [
        ...marks('first', 'j1', [5, 5, 2, 2]),
        ...marks('second', 'j1', [5, 3, 5, 2]),
        ...marks('third', 'j1', [10, 5, 5, 10]),
        ...marks('fourth', 'j1', [1, 1, 1, 1]),
      ],
      recusals: [],
    });

    expect(summary(ranked)).toEqual([
      {
        entryId: 'third',
        total: 100,
        rank: 1,
        trackRank: null,
        isTieUnresolved: false,
      },
      {
        entryId: 'first',
        total: 60,
        rank: 2,
        trackRank: null,
        isTieUnresolved: true,
      },
      {
        entryId: 'second',
        total: 60,
        rank: 2,
        trackRank: null,
        isTieUnresolved: true,
      },
      {
        entryId: 'fourth',
        total: 15,
        rank: 4,
        trackRank: null,
        isTieUnresolved: false,
      },
    ]);
  });

  it('takes the first of two equally heavy criteria, in the published order, as the heaviest', () => {
    const ranked = rankEntries({
      criteria: [
        { id: 'execution', weight: 35, scale: 5, position: 2 },
        { id: 'originality', weight: 15, scale: 5, position: 3 },
        { id: 'impact', weight: 35, scale: 10, position: 1 },
        { id: 'presentation', weight: 15, scale: 10, position: 0 },
      ],
      entries: [entry('crafted'), entry('ambitious')],
      scores: [
        ...marks('crafted', 'j1', [6, 5, 4, 4]),
        ...marks('ambitious', 'j1', [10, 3, 4, 4]),
      ],
      recusals: [],
    });

    expect(
      ranked.map(({ entryId, total, rank }) => [entryId, total, rank]),
    ).toEqual([
      ['ambitious', 74, 1],
      ['crafted', 74, 2],
    ]);
    expect(ranked[0]?.criteria.map(({ criterionId }) => criterionId)).toEqual([
      'presentation',
      'impact',
      'execution',
      'originality',
    ]);
  });

  it('ranks each entry within its track as well as overall', () => {
    const ranked = rankEntries({
      criteria,
      entries: [
        entry('ai-low', 'ai'),
        entry('open', null),
        entry('web-top', 'web'),
        entry('ai-top', 'ai'),
        entry('ai-waiting', 'ai'),
      ],
      scores: [
        ...marks('ai-low', 'j1', [4, 2, 2, 4]),
        ...marks('open', 'j1', [10, 5, 5, 10]),
        ...marks('web-top', 'j1', [6, 3, 3, 6]),
        ...marks('ai-top', 'j1', [8, 4, 4, 8]),
        ...marks('ai-waiting', 'j1', [8, null, 4, 8]),
      ],
      recusals: [],
    });

    expect(
      ranked.map(({ entryId, rank, trackRank }) => [entryId, rank, trackRank]),
    ).toEqual([
      ['open', 1, null],
      ['ai-top', 2, 1],
      ['web-top', 3, 1],
      ['ai-low', 4, 2],
      ['ai-waiting', null, null],
    ]);
  });
});
