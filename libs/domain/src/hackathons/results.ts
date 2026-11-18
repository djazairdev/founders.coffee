import { z } from 'zod';

import {
  AppError,
  err,
  HACKATHON_RESULTS_REASON_MAX,
  HACKATHON_TIE_ORDER_MAX,
  idSchema,
  ok,
  type HackathonResultTieNote,
  type Result,
} from '@founders-coffee/core';

import type {
  CriterionResult,
  JudgeScore,
  RankedEntry,
  RankingCriterion,
  RankingEntry,
  Recusal,
} from './ranking.js';

export const hackathonResultsSchema = z.strictObject({ eventId: idSchema });

export const publishResultsSchema = z.strictObject({
  eventId: idSchema,
  missingScoresReason: z
    .string()
    .trim()
    .max(HACKATHON_RESULTS_REASON_MAX)
    .transform((reason) => (reason === '' ? null : reason))
    .nullable()
    .default(null),
  tieOrder: z.array(idSchema).max(HACKATHON_TIE_ORDER_MAX).default([]),
});

export type PublishResultsInput = z.infer<typeof publishResultsSchema>;

export type SettledResult = {
  readonly entryId: string;
  readonly trackId: string | null;
  readonly criteria: readonly CriterionResult[];
  readonly total: number | null;
  readonly rank: number | null;
  readonly trackRank: number | null;
  readonly tieNote: HackathonResultTieNote | null;
};

/**
 * The entries still short of scores (B-JDG-09): one with an accepted judge who neither recused from
 * it nor scored it on every criterion, or one the ranking could not total, which is how an entry
 * every judge recused from shows.
 */
export const entriesMissingScores = (input: {
  readonly entries: readonly RankingEntry[];
  readonly criteria: readonly RankingCriterion[];
  readonly judgeIds: readonly string[];
  readonly scores: readonly JudgeScore[];
  readonly recusals: readonly Recusal[];
  readonly ranked: readonly RankedEntry[];
}): readonly string[] =>
  input.entries
    .filter((entry) => {
      const isUntotalled = input.ranked.some(
        (ranked) => ranked.entryId === entry.id && ranked.total === null,
      );
      return (
        isUntotalled ||
        input.judgeIds.some(
          (judgeId) =>
            !input.recusals.some(
              (recusal) =>
                recusal.entryId === entry.id && recusal.judgeId === judgeId,
            ) &&
            input.scores.filter(
              (score) =>
                score.entryId === entry.id && score.judgeId === judgeId,
            ).length < input.criteria.length,
        )
      );
    })
    .map((entry) => entry.id);

/** The entries the ranking rule could not separate, one list per shared rank, best rank first. */
export const tiedGroupsOf = (
  ranked: readonly RankedEntry[],
): readonly (readonly string[])[] => {
  const groups = new Map<number, string[]>();
  for (const entry of ranked)
    if (entry.isTieUnresolved && entry.rank !== null)
      groups.set(entry.rank, [
        ...(groups.get(entry.rank) ?? []),
        entry.entryId,
      ]);
  return [...groups.values()];
};

const isExactPick = (
  groups: readonly (readonly string[])[],
  tieOrder: readonly string[],
): boolean => {
  const tied = groups.flat();
  return (
    tied.length === tieOrder.length &&
    new Set(tieOrder).size === tieOrder.length &&
    tied.every((entryId) => tieOrder.includes(entryId))
  );
};

/**
 * Place every entry for good: the organiser's pick orders each tie, so no rank is shared any more,
 * and a track's ranks follow the overall order. Entries without a total stay unranked, last.
 */
export const settleResults = (
  ranked: readonly RankedEntry[],
  tieOrder: readonly string[],
): readonly SettledResult[] => {
  const pickOf = (entry: RankedEntry) => tieOrder.indexOf(entry.entryId);
  const placed = ranked
    .filter((entry) => entry.rank !== null)
    .sort(
      (left, right) =>
        (left.rank ?? 0) - (right.rank ?? 0) || pickOf(left) - pickOf(right),
    );
  const trackPlaces = new Map<string, number>();
  const settled = placed.map((entry, index) => {
    const trackRank = entry.trackId
      ? (trackPlaces.get(entry.trackId) ?? 0) + 1
      : null;
    if (entry.trackId && trackRank) trackPlaces.set(entry.trackId, trackRank);
    return {
      entryId: entry.entryId,
      trackId: entry.trackId,
      criteria: entry.criteria,
      total: entry.total,
      rank: index + 1,
      trackRank,
      tieNote: entry.isTieUnresolved ? ('organiser_pick' as const) : null,
    };
  });
  const unranked = ranked
    .filter((entry) => entry.rank === null)
    .map((entry) => ({
      entryId: entry.entryId,
      trackId: entry.trackId,
      criteria: entry.criteria,
      total: null,
      rank: null,
      trackRank: null,
      tieNote: null,
    }));
  return [...settled, ...unranked];
};

/**
 * Decide whether an organiser may publish a hackathon's results (B-JDG-09): once, for a published
 * hackathon that was not cancelled (`hackathon_not_editable`, `results_already_published`), after
 * judging ended (`judging_not_ended`), with at least one entry (`results_no_entries`), a written
 * reason when scores are missing (`missing_scores_reason_required`) and a pick for exactly the
 * entries that are tied (`tie_pick_required`). Returns the results to freeze.
 */
export const decidePublishResults = (input: {
  readonly isPublic: boolean;
  readonly isPublished: boolean;
  readonly judgingEndsAt: number;
  readonly now: number;
  readonly ranked: readonly RankedEntry[];
  readonly missingEntries: readonly string[];
  readonly missingScoresReason: string | null;
  readonly tieOrder: readonly string[];
}): Result<readonly SettledResult[]> => {
  if (!input.isPublic)
    return err(
      new AppError(
        'hackathon_not_editable',
        'Only a published hackathon publishes results',
      ),
    );
  if (input.isPublished)
    return err(
      new AppError(
        'results_already_published',
        'The results are already published',
      ),
    );
  if (input.now < input.judgingEndsAt)
    return err(new AppError('judging_not_ended', 'Judging has not ended'));
  if (input.ranked.length === 0)
    return err(
      new AppError('results_no_entries', 'No team submitted a project'),
    );
  if (input.missingEntries.length > 0 && !input.missingScoresReason)
    return err(
      new AppError(
        'missing_scores_reason_required',
        'Say why the results go out with scores missing',
      ),
    );
  if (!isExactPick(tiedGroupsOf(input.ranked), input.tieOrder))
    return err(
      new AppError(
        'tie_pick_required',
        'Every tied entry needs the organiser to place it',
      ),
    );
  return ok(settleResults(input.ranked, input.tieOrder));
};
