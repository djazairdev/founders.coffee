export type RankingCriterion = {
  readonly id: string;
  readonly weight: number;
  readonly scale: number;
  readonly position: number;
};

export type RankingEntry = {
  readonly id: string;
  readonly trackId: string | null;
};

export type JudgeScore = {
  readonly entryId: string;
  readonly judgeId: string;
  readonly criterionId: string;
  readonly score: number;
};

export type Recusal = {
  readonly entryId: string;
  readonly judgeId: string;
};

export type RankingInput = {
  readonly criteria: readonly RankingCriterion[];
  readonly entries: readonly RankingEntry[];
  readonly scores: readonly JudgeScore[];
  readonly recusals: readonly Recusal[];
};

export type CriterionResult = {
  readonly criterionId: string;
  readonly mean: number | null;
  readonly judgeCount: number;
};

export type RankedEntry = {
  readonly entryId: string;
  readonly trackId: string | null;
  readonly criteria: readonly CriterionResult[];
  readonly total: number | null;
  readonly rank: number | null;
  readonly trackRank: number | null;
  readonly isTieUnresolved: boolean;
};

type Fraction = { readonly numerator: number; readonly denominator: number };

type Tally = {
  readonly criterion: RankingCriterion;
  readonly sum: number;
  readonly count: number;
};

type Standing = {
  readonly entry: RankingEntry;
  readonly total: number;
  readonly heaviestMean: number;
  readonly bestShare: Fraction;
};

type Place = {
  readonly rank: number;
  readonly isTieUnresolved: boolean;
};

/** The greatest common divisor of two whole numbers, for keeping a fraction small. */
const greatestDivisor = (left: number, right: number): number =>
  right === 0 ? left : greatestDivisor(right, left % right);

/** A fraction in its lowest terms; its denominator is never nought. */
const fraction = (numerator: number, denominator: number): Fraction => {
  const divisor = greatestDivisor(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
};

/** The sum of two fractions, exactly. */
const addFractions = (left: Fraction, right: Fraction): Fraction =>
  fraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );

/** Whether the left fraction is the larger, compared without dividing. */
const exceeds = (left: Fraction, right: Fraction): boolean =>
  left.numerator * right.denominator > right.numerator * left.denominator;

/** A fraction in whole hundredths, a half rounded up, so that no step before it rounds anything. */
const toHundredths = ({ numerator, denominator }: Fraction): number =>
  Math.floor((numerator * 200 + denominator) / (2 * denominator));

/** A scored criterion's mean in hundredths: the published figure the tie-breaks compare. */
const meanOf = (tally: Tally): number =>
  toHundredths(fraction(tally.sum, tally.count));

/** The criterion whose weight counts most: the first of the heaviest, in the published order. */
const heaviestOf = (
  criteria: readonly RankingCriterion[],
): RankingCriterion | null =>
  criteria.reduce<RankingCriterion | null>(
    (heaviest, criterion) =>
      heaviest && heaviest.weight >= criterion.weight ? heaviest : criterion,
    null,
  );

/**
 * Tally one entry's scores, criterion by criterion, over the judges who scored it and did not step
 * out of it.
 */
const tallyEntry = (
  entry: RankingEntry,
  criteria: readonly RankingCriterion[],
  scores: readonly JudgeScore[],
  recused: ReadonlySet<string>,
): Tally[] => {
  const counted = scores.filter(
    (score) =>
      score.entryId === entry.id &&
      !recused.has(`${score.entryId}\u0000${score.judgeId}`),
  );
  return criteria.map((criterion) => {
    const given = counted.filter((score) => score.criterionId === criterion.id);
    return {
      criterion,
      sum: given.reduce((total, score) => total + score.score, 0),
      count: given.length,
    };
  });
};

/**
 * Where a fully scored entry stands. The total is out of 100: each mean as a share of its scale,
 * times its criterion's weight, added exactly and rounded once to hundredths. The tie-breaks read
 * the means as published, in hundredths, so a reader can check a ranking from the results.
 */
const standingOf = (
  entry: RankingEntry,
  tallies: readonly Tally[],
  heaviest: RankingCriterion | null,
): Standing => ({
  entry,
  total: toHundredths(
    tallies.reduce(
      (running, tally) =>
        addFractions(
          running,
          fraction(
            tally.criterion.weight * tally.sum,
            tally.count * tally.criterion.scale,
          ),
        ),
      fraction(0, 1),
    ),
  ),
  heaviestMean: tallies.reduce(
    (found, tally) => (tally.criterion === heaviest ? meanOf(tally) : found),
    0,
  ),
  bestShare: tallies.reduce(
    (best, tally) => {
      const share = fraction(meanOf(tally), tally.criterion.scale);
      return exceeds(share, best) ? share : best;
    },
    fraction(0, 1),
  ),
});

/**
 * Order two entries by the published rule: the higher total; then the higher mean on the heaviest
 * criterion; then the higher single criterion mean, as a share of its scale. Nought means the rule
 * cannot separate them, and the organiser decides.
 */
const compareStandings = (left: Standing, right: Standing): number => {
  if (left.total !== right.total) return right.total - left.total;
  if (left.heaviestMean !== right.heaviestMean)
    return right.heaviestMean - left.heaviestMean;
  if (exceeds(left.bestShare, right.bestShare)) return -1;
  return exceeds(right.bestShare, left.bestShare) ? 1 : 0;
};

/**
 * Rank entries, best first. Entries the rule cannot separate share a rank, the next rank skipping
 * as many places as they take (1, 2, 2, 4), and are marked for the organiser to decide.
 */
const place = (standings: readonly Standing[]): Map<string, Place> => {
  const sorted = [...standings].sort(compareStandings);
  return new Map(
    sorted.map((standing, index) => {
      const previous = sorted[index - 1];
      const next = sorted[index + 1];
      return [
        standing.entry.id,
        {
          rank:
            sorted.findIndex(
              (candidate) => compareStandings(candidate, standing) === 0,
            ) + 1,
          isTieUnresolved:
            (previous !== undefined &&
              compareStandings(previous, standing) === 0) ||
            (next !== undefined && compareStandings(standing, next) === 0),
        },
      ];
    }),
  );
};

/**
 * Rank a hackathon's entries from its judges' scores (B-JDG-02, V12): each criterion's mean over the
 * judges who scored it and did not recuse themselves from that entry, a weighted total out of 100, a
 * rank overall and a rank within the entry's track. An entry with a criterion no such judge scored
 * has no total and no rank yet. Ranked entries come first, best first; unranked ones follow, in the
 * order given.
 */
export const rankEntries = (input: RankingInput): RankedEntry[] => {
  const criteria = [...input.criteria].sort((a, b) => a.position - b.position);
  const heaviest = heaviestOf(criteria);
  const recused = new Set(
    input.recusals.map(
      (recusal) => `${recusal.entryId}\u0000${recusal.judgeId}`,
    ),
  );
  const tallied = input.entries.map((entry) => ({
    entry,
    tallies: tallyEntry(entry, criteria, input.scores, recused),
  }));
  const standings = tallied
    .filter(({ tallies }) => tallies.every((tally) => tally.count > 0))
    .map(({ entry, tallies }) => standingOf(entry, tallies, heaviest));
  const overall = place(standings);
  const totals = new Map(
    standings.map((standing) => [standing.entry.id, standing.total / 100]),
  );
  const trackIds = new Set(
    input.entries.flatMap((entry) => (entry.trackId ? [entry.trackId] : [])),
  );
  const trackRanks = new Map(
    [...trackIds].flatMap((trackId) => [
      ...place(
        standings.filter((standing) => standing.entry.trackId === trackId),
      ),
    ]),
  );
  const unranked = input.entries.length + 1;
  return tallied
    .map(({ entry, tallies }) => ({
      entryId: entry.id,
      trackId: entry.trackId,
      criteria: tallies.map((tally) => ({
        criterionId: tally.criterion.id,
        mean: tally.count > 0 ? meanOf(tally) / 100 : null,
        judgeCount: tally.count,
      })),
      total: totals.get(entry.id) ?? null,
      rank: overall.get(entry.id)?.rank ?? null,
      trackRank: trackRanks.get(entry.id)?.rank ?? null,
      isTieUnresolved: overall.get(entry.id)?.isTieUnresolved ?? false,
    }))
    .sort((left, right) => (left.rank ?? unranked) - (right.rank ?? unranked));
};
