import { hackathons } from '@founders-coffee/domain';

import type { JudgeEntryPageView } from './api';

type Criteria = JudgeEntryPageView['criteria'];

export type ScoreDraft = {
  readonly value: number | null;
  readonly comment: string;
};

export type ScoreDrafts = Readonly<Record<string, ScoreDraft>>;

export const EMPTY_SCORE_DRAFT: ScoreDraft = { value: null, comment: '' };

/** The radio for one value of a criterion's scale, which a missing score sends the judge to. */
export const scoreOptionId = (criterionId: string, value: number): string =>
  `judge-score-${criterionId}-${value}`;

/** One draft per criterion, from what the judge saved before. */
export const scoreDraftsOf = (
  criteria: Criteria,
  scores: JudgeEntryPageView['scores'],
): ScoreDrafts =>
  Object.fromEntries(
    criteria.map((criterion) => {
      const saved = scores.find((score) => score.criterionId === criterion.id);
      return [
        criterion.id,
        saved
          ? { value: saved.value, comment: saved.comment ?? '' }
          : EMPTY_SCORE_DRAFT,
      ];
    }),
  );

/** The first criterion still without a score, or `null` once all have one. */
export const firstUnscoredCriterion = (
  criteria: Criteria,
  drafts: ScoreDrafts,
): string | null =>
  criteria.find((criterion) => (drafts[criterion.id]?.value ?? null) === null)
    ?.id ?? null;

/** The scores to save, one per criterion that has one. */
export const scoresToSave = (criteria: Criteria, drafts: ScoreDrafts) =>
  criteria.flatMap((criterion) => {
    const draft = drafts[criterion.id];
    return draft && draft.value !== null
      ? [
          {
            criterionId: criterion.id,
            value: draft.value,
            comment: draft.comment,
          },
        ]
      : [];
  });

/** Whether a recusal reason is one the server takes: the same rule, on the same schema. */
export const isRecusalReason = (reason: string): boolean =>
  hackathons.recusalSchema.shape.reason.safeParse(reason).success;
