import { phaseAt, type HackathonTimeline } from './timeline.js';

export type JudgingStage = 'not_started' | 'judging' | 'closed';

export type JudgingWindow = {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly isCancelled: boolean;
  readonly isResultsPublished: boolean;
};

export type JudgeEntryState = 'to_score' | 'scored' | 'recused';

export type JudgeProgress = {
  readonly scored: number;
  readonly toScore: number;
  readonly recused: number;
};

/**
 * Where judging stands: open from the submission deadline until judging ends, and closed early
 * when the hackathon is cancelled or its results are published.
 */
export const judgingStageAt = (window: JudgingWindow): JudgingStage => {
  const phase = phaseAt(window.timeline, window.now);
  if (window.isCancelled || window.isResultsPublished || phase === 'results')
    return 'closed';
  return phase === 'judging' ? 'judging' : 'not_started';
};

/**
 * Where an entry stands for a judge (B-JDG-06): recused once they recused from it, scored once they
 * scored it on every criterion, and to score until then.
 */
export const judgeEntryState = (entry: {
  readonly isRecused: boolean;
  readonly scoredCount: number;
  readonly criteriaCount: number;
}): JudgeEntryState => {
  if (entry.isRecused) return 'recused';
  return entry.criteriaCount > 0 && entry.scoredCount >= entry.criteriaCount
    ? 'scored'
    : 'to_score';
};

/** How far a judge has got: their entries counted by where each stands. */
export const judgeProgressOf = (
  states: readonly JudgeEntryState[],
): JudgeProgress => ({
  scored: states.filter((state) => state === 'scored').length,
  toScore: states.filter((state) => state === 'to_score').length,
  recused: states.filter((state) => state === 'recused').length,
});
