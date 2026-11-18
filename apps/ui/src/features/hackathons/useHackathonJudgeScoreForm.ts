import { useState } from 'react';

import type { JudgeEntryPageView } from './api';
import {
  firstUnscoredCriterion,
  scoreDraftsOf,
  scoreOptionId,
  scoresToSave,
  type ScoreDraft,
  type ScoreDrafts,
} from './judging-form';
import { useSaveJudgeScores } from './judging-hooks';

/**
 * The state behind a judge's score form (B-JDG-07). Saving with a criterion unscored saves nothing
 * and takes the judge to the first one, by focus, so a keyboard user lands on its scale.
 */
export const useHackathonJudgeScoreForm = ({
  eventId,
  submissionId,
  criteria,
  scores,
}: {
  eventId: string;
  submissionId: string;
  criteria: JudgeEntryPageView['criteria'];
  scores: JudgeEntryPageView['scores'];
}) => {
  const save = useSaveJudgeScores(eventId);
  const [drafts, setDrafts] = useState<ScoreDrafts>(() =>
    scoreDraftsOf(criteria, scores),
  );
  const [hasTried, setHasTried] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const change = (criterionId: string, draft: ScoreDraft) => {
    setDrafts({ ...drafts, [criterionId]: draft });
    setIsSaved(false);
    save.reset();
  };

  const submit = () => {
    setHasTried(true);
    setIsSaved(false);
    save.reset();
    const unscored = firstUnscoredCriterion(criteria, drafts);
    if (unscored) {
      document.getElementById(scoreOptionId(unscored, 1))?.focus();
      return;
    }
    save.mutate(
      { eventId, submissionId, scores: scoresToSave(criteria, drafts) },
      { onSuccess: () => setIsSaved(true) },
    );
  };

  return {
    drafts,
    hasTried,
    isSaved,
    isSaving: save.isPending,
    error: save.error,
    change,
    submit,
  };
};
