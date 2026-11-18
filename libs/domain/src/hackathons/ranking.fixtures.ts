import {
  type JudgeScore,
  type rankEntries,
  type RankingCriterion,
  type RankingEntry,
} from './ranking.js';

export const criteria: RankingCriterion[] = [
  { id: 'impact', weight: 40, scale: 10, position: 0 },
  { id: 'execution', weight: 30, scale: 5, position: 1 },
  { id: 'originality', weight: 20, scale: 5, position: 2 },
  { id: 'presentation', weight: 10, scale: 10, position: 3 },
];

export const marks = (
  entryId: string,
  judgeId: string,
  [impact, execution, originality, presentation]: readonly (number | null)[],
): JudgeScore[] =>
  (
    [
      ['impact', impact],
      ['execution', execution],
      ['originality', originality],
      ['presentation', presentation],
    ] as const
  ).flatMap(([criterionId, score]) =>
    score === null || score === undefined
      ? []
      : [{ entryId, judgeId, criterionId, score }],
  );

export const entry = (
  id: string,
  trackId: string | null = null,
): RankingEntry => ({
  id,
  trackId,
});

export const summary = (ranked: ReturnType<typeof rankEntries>) =>
  ranked.map(({ entryId, total, rank, trackRank, isTieUnresolved }) => ({
    entryId,
    total,
    rank,
    trackRank,
    isTieUnresolved,
  }));
