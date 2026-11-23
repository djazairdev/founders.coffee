import {
  hackathon_application_questions_invalid_error,
  hackathon_application_questions_required_error,
  hackathon_application_questions_required,
  hackathon_application_questions_optional,
  type Locale,
} from '@founders-coffee/i18n';
import { Input, StatusMessage } from '@founders-coffee/ui';

import type {
  HackathonApplicationAnswer,
  HackathonApplicationQuestion,
} from '../application-answers';

const answerFor = (
  answers: readonly HackathonApplicationAnswer[],
  questionId: string,
) => answers.find((answer) => answer.questionId === questionId)?.value;

const AnswerField = ({
  question,
  answer,
  locale,
  error,
  onChange,
}: {
  question: HackathonApplicationQuestion;
  answer: string | readonly string[] | undefined;
  locale: Locale;
  error: 'required' | 'invalid' | null;
  onChange: (value: string | string[]) => void;
}) => {
  const options = { locale };
  const id = `application-question-${question.id}`;
  const errorId = `${id}-error`;
  const isError = error !== null;
  const errorMessage =
    error === 'required'
      ? hackathon_application_questions_required_error({}, options)
      : hackathon_application_questions_invalid_error({}, options);
  const label = (
    <span className="flex flex-wrap items-center gap-2">
      <bdi dir="auto">{question.label}</bdi>
      <span className="text-body-sm text-neutral">
        {question.isRequired
          ? hackathon_application_questions_required({}, options)
          : hackathon_application_questions_optional({}, options)}
      </span>
    </span>
  );
  const aria = {
    'aria-invalid': isError || undefined,
    'aria-describedby': isError ? errorId : undefined,
  };
  const singleValue = typeof answer === 'string' ? answer : '';
  const multipleValues = Array.isArray(answer) ? answer : [];

  return (
    <div className="grid gap-2 rounded-box border border-base-300 bg-base-100 p-4">
      {question.type === 'single_choice' ||
      question.type === 'multiple_choice' ? (
        <fieldset id={id} tabIndex={-1} className="grid gap-3" {...aria}>
          <legend className="text-label">{label}</legend>
          <div className="grid gap-2">
            {question.options.map((option) => (
              <label key={option} className="flex min-h-11 items-center gap-3">
                <input
                  type={
                    question.type === 'single_choice' ? 'radio' : 'checkbox'
                  }
                  name={id}
                  value={option}
                  className={
                    question.type === 'single_choice'
                      ? 'radio radio-sm radio-primary'
                      : 'checkbox checkbox-sm checkbox-primary'
                  }
                  checked={
                    question.type === 'single_choice'
                      ? singleValue === option
                      : multipleValues.includes(option)
                  }
                  onChange={(event) => {
                    if (question.type === 'single_choice') onChange(option);
                    else {
                      const next = new Set(multipleValues);
                      if (event.target.checked) next.add(option);
                      else next.delete(option);
                      onChange([...next]);
                    }
                  }}
                />
                <bdi dir="auto" className="text-body-sm">
                  {option}
                </bdi>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <label htmlFor={id} className="grid gap-2">
          <span className="text-label">{label}</span>
          {question.type === 'long_text' ? (
            <textarea
              id={id}
              className="textarea textarea-sm md:textarea-md w-full"
              rows={3}
              dir="auto"
              maxLength={2000}
              value={singleValue}
              {...aria}
              onChange={(event) => onChange(event.target.value)}
            />
          ) : (
            <Input
              id={id}
              type={question.type === 'url' ? 'url' : 'text'}
              dir="auto"
              maxLength={question.type === 'short_text' ? 300 : 2000}
              value={singleValue}
              {...aria}
              onChange={(event) => onChange(event.target.value)}
            />
          )}
        </label>
      )}
      {isError ? (
        <StatusMessage
          id={errorId}
          variant="error"
          className="border-0 bg-transparent p-0 text-body-sm text-error"
        >
          {errorMessage}
        </StatusMessage>
      ) : null}
    </div>
  );
};

export const HackathonApplicationAnswerFields = ({
  questions,
  answers,
  locale,
  errorQuestionId = null,
  errorReason = null,
  onChange,
}: {
  questions: readonly HackathonApplicationQuestion[];
  answers: readonly HackathonApplicationAnswer[];
  locale: Locale;
  errorQuestionId?: string | null;
  errorReason?: 'required' | 'invalid' | null;
  onChange: (answers: readonly HackathonApplicationAnswer[]) => void;
}) => (
  <div className="grid gap-3">
    {questions.map((question) => (
      <AnswerField
        key={question.id}
        question={question}
        answer={answerFor(answers, question.id)}
        locale={locale}
        error={errorQuestionId === question.id ? errorReason : null}
        onChange={(value) =>
          onChange([
            ...answers.filter((answer) => answer.questionId !== question.id),
            { questionId: question.id, value },
          ])
        }
      />
    ))}
  </div>
);
