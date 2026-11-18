import type { FormEvent } from 'react';

import {
  hackathon_judging_comments_note,
  hackathon_judging_no_criteria,
  hackathon_judging_save,
  hackathon_judging_saved,
  hackathon_judging_saving,
  hackathon_judging_scores_heading,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { JudgeEntryPageView } from '../api';
import { judgingErrorMessage } from '../judging-errors';
import { EMPTY_SCORE_DRAFT } from '../judging-form';
import { useHackathonJudgeScoreForm } from '../useHackathonJudgeScoreForm';
import { HackathonJudgeCriterionField } from './HackathonJudgeCriterionField';

const HEADING_ID = 'hackathon-judge-scores-heading';

export const HackathonJudgeScoreForm = ({
  eventId,
  submissionId,
  criteria,
  scores,
  locale,
}: {
  eventId: string;
  submissionId: string;
  criteria: JudgeEntryPageView['criteria'];
  scores: JudgeEntryPageView['scores'];
  locale: Locale;
}) => {
  const options = { locale };
  const form = useHackathonJudgeScoreForm({
    eventId,
    submissionId,
    criteria,
    scores,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    form.submit();
  };
  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_judging_scores_heading({}, options)}
      </h2>
      {criteria.length === 0 ? (
        <p className="mt-2 text-body-sm text-neutral">
          {hackathon_judging_no_criteria({}, options)}
        </p>
      ) : (
        <form noValidate onSubmit={submit} className="mt-2 grid gap-4">
          <p className="text-body-sm text-neutral">
            {hackathon_judging_comments_note({}, options)}
          </p>
          {criteria.map((criterion) => {
            const draft = form.drafts[criterion.id] ?? EMPTY_SCORE_DRAFT;
            return (
              <HackathonJudgeCriterionField
                key={criterion.id}
                criterion={criterion}
                draft={draft}
                isMissing={form.hasTried && draft.value === null}
                isDisabled={form.isSaving}
                locale={locale}
                onChange={(next) => form.change(criterion.id, next)}
              />
            );
          })}
          {form.error ? (
            <StatusMessage variant="error">
              {judgingErrorMessage(form.error, locale)}
            </StatusMessage>
          ) : null}
          {form.isSaved ? (
            <StatusMessage variant="success">
              {hackathon_judging_saved({}, options)}
            </StatusMessage>
          ) : null}
          <div>
            <Button type="submit" variant="primary" isBusy={form.isSaving}>
              {form.isSaving
                ? hackathon_judging_saving({}, options)
                : hackathon_judging_save({}, options)}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};
