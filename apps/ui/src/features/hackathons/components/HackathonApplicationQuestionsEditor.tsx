import { useState, type FormEvent } from 'react';

import { id } from '@founders-coffee/core';
import {
  formatNumber,
  hackathon_application_questions_add,
  hackathon_application_questions_description,
  hackathon_application_questions_heading,
  hackathon_application_questions_limit,
  hackathon_application_questions_privacy,
  hackathon_application_questions_save,
  hackathon_application_questions_save_error,
  hackathon_application_questions_saved,
  hackathon_application_questions_saving,
  hackathon_application_questions_unavailable,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import {
  checkApplicationQuestions,
  HACKATHON_APPLICATION_QUESTION_LIMIT,
  type HackathonApplicationQuestion,
} from '../application-answers';
import { useSaveHackathonApplicationQuestions } from '../hooks';
import { HackathonApplicationQuestionEditor } from './HackathonApplicationQuestionEditor';

const addQuestion = (): HackathonApplicationQuestion => ({
  id: id('qst'),
  scope: 'participant',
  type: 'short_text',
  label: '',
  isRequired: false,
  options: [],
});

export const HackathonApplicationQuestionsEditor = ({
  eventId,
  version,
  questions,
  canEdit,
  locale,
}: {
  eventId: string;
  version: number;
  questions: readonly HackathonApplicationQuestion[];
  canEdit: boolean;
  locale: Locale;
}) => {
  const options = { locale };
  const save = useSaveHackathonApplicationQuestions();
  const [draft, setDraft] =
    useState<readonly HackathonApplicationQuestion[]>(questions);
  const [hasError, setHasError] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const update = (index: number, question: HackathonApplicationQuestion) =>
    setDraft((current) =>
      current.map((item, position) => (position === index ? question : item)),
    );
  const move = (from: number, to: number) => {
    setDraft((current) => {
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || save.isPending) return;
    const checked = checkApplicationQuestions(draft);
    if (!checked.success) {
      setHasSaved(false);
      setHasError(true);
      return;
    }
    setHasError(false);
    setHasSaved(false);
    save.mutate(
      { eventId, version, questions: checked.data },
      {
        onSuccess: () => setHasSaved(true),
        onError: () => setHasError(true),
      },
    );
  };

  return (
    <section
      className="mt-6 rounded-box border border-base-300 p-4 sm:p-6"
      aria-labelledby="hackathon-application-questions-heading"
    >
      <h2
        id="hackathon-application-questions-heading"
        className="font-display text-h4"
      >
        {hackathon_application_questions_heading({}, options)}
      </h2>
      <p className="mt-2 text-body-sm text-neutral">
        {hackathon_application_questions_description({}, options)}
      </p>
      <p className="mt-2 text-body-xs text-neutral">
        {hackathon_application_questions_limit(
          { count: formatNumber(HACKATHON_APPLICATION_QUESTION_LIMIT, locale) },
          options,
        )}
      </p>
      {!canEdit ? (
        <StatusMessage variant="info" className="mt-3">
          {hackathon_application_questions_unavailable({}, options)}
        </StatusMessage>
      ) : null}
      <form className="mt-5 grid gap-4" noValidate onSubmit={submit}>
        {draft.map((question, index) => (
          <HackathonApplicationQuestionEditor
            key={question.id}
            question={question}
            index={index}
            count={draft.length}
            canEdit={canEdit}
            isBusy={save.isPending}
            locale={locale}
            onChange={(next) => update(index, next)}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() =>
              setDraft((current) =>
                current.filter((_, position) => position !== index),
              )
            }
          />
        ))}
        <p className="text-body-xs text-neutral">
          {hackathon_application_questions_privacy({}, options)}
        </p>
        {hasError ? (
          <StatusMessage variant="error" aria-live="polite">
            {hackathon_application_questions_save_error({}, options)}
          </StatusMessage>
        ) : null}
        {hasSaved ? (
          <StatusMessage variant="success" aria-live="polite">
            {hackathon_application_questions_saved({}, options)}
          </StatusMessage>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraft((current) => [...current, addQuestion()])}
            disabled={
              !canEdit ||
              save.isPending ||
              draft.length >= HACKATHON_APPLICATION_QUESTION_LIMIT
            }
          >
            {hackathon_application_questions_add({}, options)}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isBusy={save.isPending}
            disabled={!canEdit}
          >
            {save.isPending
              ? hackathon_application_questions_saving({}, options)
              : hackathon_application_questions_save({}, options)}
          </Button>
        </div>
      </form>
    </section>
  );
};
