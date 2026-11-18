export type FeedbackCriterion = {
  readonly criterionId: string;
  readonly name: string;
  readonly scale: number;
};

export type FeedbackScore = {
  readonly judgeId: string;
  readonly criterionId: string;
  readonly value: number;
  readonly comment: string | null;
};

export type TeamFeedbackJudge = {
  readonly number: number;
  readonly scores: readonly {
    readonly criterionId: string;
    readonly name: string;
    readonly scale: number;
    readonly value: number;
    readonly comment: string | null;
  }[];
};

export type TeamFeedback = {
  readonly title: string;
  readonly judges: readonly TeamFeedbackJudge[];
};

/**
 * What a team reads about its own entry (B-JDG-12): each judge who scored it as a number, with their
 * score and comment per criterion in the rubric's order. Judges are numbered by their ids, which are
 * random, so a number says nothing about who was invited first; the ids stay here, so nothing the
 * team receives can name a judge.
 */
export const teamFeedbackOf = (
  title: string,
  criteria: readonly FeedbackCriterion[],
  scores: readonly FeedbackScore[],
): TeamFeedback => {
  const judgeIds = [...new Set(scores.map((score) => score.judgeId))].sort();
  return {
    title,
    judges: judgeIds.map((judgeId, index) => ({
      number: index + 1,
      scores: criteria.flatMap((criterion) => {
        const score = scores.find(
          (item) =>
            item.judgeId === judgeId &&
            item.criterionId === criterion.criterionId,
        );
        return score
          ? [
              {
                criterionId: criterion.criterionId,
                name: criterion.name,
                scale: criterion.scale,
                value: score.value,
                comment: score.comment,
              },
            ]
          : [];
      }),
    })),
  };
};
