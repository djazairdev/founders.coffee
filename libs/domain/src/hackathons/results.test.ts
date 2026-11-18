import { describe, expect, it } from 'vitest';

import type { RankedEntry } from './ranking.js';
import {
  decidePublishResults,
  entriesMissingScores,
  publishResultsSchema,
  settleResults,
  tiedGroupsOf,
} from './results.js';

const entry = (
  entryId: string,
  rank: number | null,
  changes: Partial<RankedEntry> = {},
): RankedEntry => ({
  entryId,
  trackId: null,
  criteria: [],
  total: rank === null ? null : 100 - rank,
  rank,
  trackRank: null,
  isTieUnresolved: false,
  ...changes,
});

const tied = { isTieUnresolved: true };

const publishing = {
  isPublic: true,
  isPublished: false,
  judgingEndsAt: 1_000,
  now: 2_000,
  ranked: [entry('sub_a', 1)],
  missingEntries: [],
  missingScoresReason: null,
  tieOrder: [],
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

describe('settleResults (B-JDG-09)', () => {
  it('orders each tie by the pick, so no rank is shared, and notes the entries it decided', () => {
    const settled = settleResults(
      [
        entry('sub_a', 1),
        entry('sub_b', 2, tied),
        entry('sub_c', 2, tied),
        entry('sub_d', 4),
      ],
      ['sub_c', 'sub_b'],
    );

    expect(
      settled.map(({ entryId, rank, tieNote }) => [entryId, rank, tieNote]),
    ).toEqual([
      ['sub_a', 1, null],
      ['sub_c', 2, 'organiser_pick'],
      ['sub_b', 3, 'organiser_pick'],
      ['sub_d', 4, null],
    ]);
  });

  it('ranks a track by the overall order, the pick included', () => {
    const settled = settleResults(
      [
        entry('sub_a', 1, { trackId: 'trk_1', ...tied }),
        entry('sub_b', 1, { trackId: 'trk_1', ...tied }),
        entry('sub_c', 3, { trackId: 'trk_2' }),
        entry('sub_d', 4, { trackId: 'trk_1' }),
        entry('sub_e', 5),
      ],
      ['sub_b', 'sub_a'],
    );

    expect(
      settled.map(({ entryId, trackRank }) => [entryId, trackRank]),
    ).toEqual([
      ['sub_b', 1],
      ['sub_a', 2],
      ['sub_c', 1],
      ['sub_d', 3],
      ['sub_e', null],
    ]);
  });

  it('leaves an entry without a total unranked and last', () => {
    const settled = settleResults(
      [entry('sub_a', null, { trackId: 'trk_1' }), entry('sub_b', 1)],
      [],
    );

    expect(
      settled.map(({ entryId, rank, trackRank }) => [entryId, rank, trackRank]),
    ).toEqual([
      ['sub_b', 1, null],
      ['sub_a', null, null],
    ]);
  });
});

describe('tiedGroupsOf (B-JDG-09)', () => {
  it('keeps one list per shared rank', () => {
    expect(
      tiedGroupsOf([
        entry('sub_a', 1, tied),
        entry('sub_b', 1, tied),
        entry('sub_c', 3),
        entry('sub_d', 4, tied),
        entry('sub_e', 4, tied),
      ]),
    ).toEqual([
      ['sub_a', 'sub_b'],
      ['sub_d', 'sub_e'],
    ]);
  });
});

describe('entriesMissingScores (B-JDG-09)', () => {
  const criteria = [
    { id: 'crt_1', weight: 50, scale: 5, position: 0 },
    { id: 'crt_2', weight: 50, scale: 5, position: 1 },
  ];
  const full = (entryId: string, judgeId: string) =>
    criteria.map(({ id }) => ({
      entryId,
      judgeId,
      criterionId: id,
      score: 3,
    }));
  const missing = (input: {
    scores: ReturnType<typeof full>;
    recusals?: { entryId: string; judgeId: string }[];
    ranked?: RankedEntry[];
  }) =>
    entriesMissingScores({
      entries: [{ id: 'sub_a', trackId: null }],
      criteria,
      judgeIds: ['jdg_1', 'jdg_2'],
      recusals: [],
      ranked: [entry('sub_a', 1)],
      ...input,
    });

  it('finds an entry an accepted judge has not fully scored', () => {
    expect(missing({ scores: full('sub_a', 'jdg_1') })).toEqual(['sub_a']);
    expect(
      missing({
        scores: [...full('sub_a', 'jdg_1'), ...full('sub_a', 'jdg_2').slice(1)],
      }),
    ).toEqual(['sub_a']);
  });

  it('expects nothing from a judge who recused', () => {
    expect(
      missing({
        scores: full('sub_a', 'jdg_1'),
        recusals: [{ entryId: 'sub_a', judgeId: 'jdg_2' }],
      }),
    ).toEqual([]);
  });

  it('counts an entry every judge recused from, which has no total', () => {
    expect(
      missing({
        scores: [],
        recusals: [
          { entryId: 'sub_a', judgeId: 'jdg_1' },
          { entryId: 'sub_a', judgeId: 'jdg_2' },
        ],
        ranked: [entry('sub_a', null)],
      }),
    ).toEqual(['sub_a']);
  });

  it('is empty when every judge scored every criterion', () => {
    expect(
      missing({
        scores: [...full('sub_a', 'jdg_1'), ...full('sub_a', 'jdg_2')],
      }),
    ).toEqual([]);
  });
});

describe('decidePublishResults (B-JDG-09)', () => {
  it('returns the results to freeze', () => {
    const decided = decidePublishResults(publishing);

    expect(decided).toMatchObject({
      ok: true,
      data: [{ entryId: 'sub_a', rank: 1 }],
    });
  });

  it('refuses a hackathon that is not public, or was published already', () => {
    expect(
      codeOf(decidePublishResults({ ...publishing, isPublic: false })),
    ).toBe('hackathon_not_editable');
    expect(
      codeOf(decidePublishResults({ ...publishing, isPublished: true })),
    ).toBe('results_already_published');
  });

  it('opens at the moment judging ends, not before', () => {
    expect(codeOf(decidePublishResults({ ...publishing, now: 999 }))).toBe(
      'judging_not_ended',
    );
    expect(
      codeOf(decidePublishResults({ ...publishing, now: 1_000 })),
    ).toBeNull();
  });

  it('refuses a hackathon nobody submitted to', () => {
    expect(codeOf(decidePublishResults({ ...publishing, ranked: [] }))).toBe(
      'results_no_entries',
    );
  });

  it('needs a written reason when scores are missing', () => {
    const missing = { ...publishing, missingEntries: ['sub_a'] };

    expect(codeOf(decidePublishResults(missing))).toBe(
      'missing_scores_reason_required',
    );
    expect(
      codeOf(
        decidePublishResults({
          ...missing,
          missingScoresReason: 'A judge fell ill.',
        }),
      ),
    ).toBeNull();
  });

  it('needs a pick for exactly the tied entries', () => {
    const tie = {
      ...publishing,
      ranked: [
        entry('sub_a', 1, tied),
        entry('sub_b', 1, tied),
        entry('sub_c', 3),
      ],
    };
    const withOrder = (tieOrder: string[]) =>
      codeOf(decidePublishResults({ ...tie, tieOrder }));

    expect(withOrder([])).toBe('tie_pick_required');
    expect(withOrder(['sub_a'])).toBe('tie_pick_required');
    expect(withOrder(['sub_a', 'sub_a'])).toBe('tie_pick_required');
    expect(withOrder(['sub_a', 'sub_c'])).toBe('tie_pick_required');
    expect(withOrder(['sub_b', 'sub_a', 'sub_c'])).toBe('tie_pick_required');
    expect(withOrder(['sub_b', 'sub_a'])).toBeNull();
  });

  it('refuses a pick when nothing is tied', () => {
    expect(
      codeOf(decidePublishResults({ ...publishing, tieOrder: ['sub_a'] })),
    ).toBe('tie_pick_required');
  });
});

describe('publishResultsSchema (B-JDG-09)', () => {
  it('takes a blank reason as none', () => {
    expect(
      publishResultsSchema.parse({
        eventId: 'evt_0123456789abcdef0123456789abcdef',
        missingScoresReason: '   ',
      }),
    ).toMatchObject({ missingScoresReason: null, tieOrder: [] });
  });
});
