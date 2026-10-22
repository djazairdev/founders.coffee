import { describe, expect, it } from 'vitest';

import { criteria, entry, marks, summary } from './ranking.fixtures.js';
import { rankEntries } from './ranking.js';

describe('scoring hackathon entries (B-JDG-02)', () => {
  it('averages each criterion over its judges and weighs the means into a total out of 100', () => {
    const [ranked] = rankEntries({
      criteria,
      entries: [entry('a')],
      scores: [
        ...marks('a', 'j1', [8, 4, 5, 7]),
        ...marks('a', 'j2', [9, 4, 3, 8]),
      ],
      recusals: [],
    });

    expect(ranked).toEqual({
      entryId: 'a',
      trackId: null,
      criteria: [
        { criterionId: 'impact', mean: 8.5, judgeCount: 2 },
        { criterionId: 'execution', mean: 4, judgeCount: 2 },
        { criterionId: 'originality', mean: 4, judgeCount: 2 },
        { criterionId: 'presentation', mean: 7.5, judgeCount: 2 },
      ],
      total: 81.5,
      rank: 1,
      trackRank: null,
      isTieUnresolved: false,
    });
  });

  it('adds the weighted means exactly and rounds the total once, to hundredths', () => {
    const [ranked] = rankEntries({
      criteria,
      entries: [entry('a')],
      scores: [
        ...marks('a', 'j1', [8, 4, 4, 8]),
        ...marks('a', 'j2', [8, 4, 4, 8]),
        ...marks('a', 'j3', [9, 5, 4, 9]),
      ],
      recusals: [],
    });

    expect(ranked?.criteria.map(({ mean }) => mean)).toEqual([
      8.33, 4.33, 4, 8.33,
    ]);
    expect(ranked?.total).toBe(83.67);
  });

  it('rounds a half up, for a mean and for the total', () => {
    const [ranked] = rankEntries({
      criteria,
      entries: [entry('a')],
      scores: ['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'j8'].flatMap(
        (judgeId, index) =>
          marks('a', judgeId, [10, 5, 5, index === 0 ? 9 : 8]),
      ),
      recusals: [],
    });

    expect(ranked?.criteria[3]?.mean).toBe(8.13);
    expect(ranked?.total).toBe(98.13);
  });

  it('leaves out the scores of a judge who stepped out of that entry, and only that entry', () => {
    const ranked = rankEntries({
      criteria,
      entries: [entry('a'), entry('b')],
      scores: [
        ...marks('a', 'j1', [10, 5, 5, 10]),
        ...marks('a', 'conflicted', [1, 1, 1, 1]),
        ...marks('b', 'j1', [5, 5, 5, 5]),
        ...marks('b', 'conflicted', [5, 5, 5, 5]),
      ],
      recusals: [{ entryId: 'a', judgeId: 'conflicted' }],
    });

    expect(summary(ranked)).toEqual([
      {
        entryId: 'a',
        total: 100,
        rank: 1,
        trackRank: null,
        isTieUnresolved: false,
      },
      {
        entryId: 'b',
        total: 75,
        rank: 2,
        trackRank: null,
        isTieUnresolved: false,
      },
    ]);
    expect(ranked[0]?.criteria[0]?.judgeCount).toBe(1);
  });

  it('averages over the judges who scored a criterion, and leaves an entry with one unscored unranked, last', () => {
    const ranked = rankEntries({
      criteria,
      entries: [entry('waiting'), entry('partly'), entry('done')],
      scores: [
        ...marks('waiting', 'j1', [9, 5, 5, null]),
        ...marks('partly', 'j1', [6, 3, 3, 6]),
        ...marks('partly', 'j2', [8, null, null, null]),
        ...marks('done', 'j1', [5, 5, 5, 5]),
      ],
      recusals: [{ entryId: 'waiting', judgeId: 'j2' }],
    });

    expect(summary(ranked)).toEqual([
      {
        entryId: 'done',
        total: 75,
        rank: 1,
        trackRank: null,
        isTieUnresolved: false,
      },
      {
        entryId: 'partly',
        total: 64,
        rank: 2,
        trackRank: null,
        isTieUnresolved: false,
      },
      {
        entryId: 'waiting',
        total: null,
        rank: null,
        trackRank: null,
        isTieUnresolved: false,
      },
    ]);
    expect(ranked[1]?.criteria[0]).toEqual({
      criterionId: 'impact',
      mean: 7,
      judgeCount: 2,
    });
    expect(ranked[2]?.criteria[3]).toEqual({
      criterionId: 'presentation',
      mean: null,
      judgeCount: 0,
    });
  });

  it('gives no rank to a hackathon with no scores yet', () => {
    expect(
      summary(
        rankEntries({
          criteria,
          entries: [entry('a')],
          scores: [],
          recusals: [],
        }),
      ),
    ).toEqual([
      {
        entryId: 'a',
        total: null,
        rank: null,
        trackRank: null,
        isTieUnresolved: false,
      },
    ]);
  });
});
