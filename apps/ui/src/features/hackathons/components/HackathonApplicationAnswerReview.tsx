import {
  formatNumber,
  hackathon_application_answers_empty,
  hackathon_application_answers_reveal,
  type Locale,
} from '@founders-coffee/i18n';

import type {
  HackathonApplicationAnswer,
  HackathonApplicationQuestion,
} from '../application-answers';

export const HackathonApplicationAnswerReview = ({
  answers,
  questions,
  locale,
}: {
  answers: readonly HackathonApplicationAnswer[];
  questions: readonly HackathonApplicationQuestion[];
  locale: Locale;
}) => {
  const options = { locale };
  const values = new Map(
    answers.map((answer) => [answer.questionId, answer.value]),
  );
  return (
    <details className="min-w-48">
      <summary className="min-h-11 cursor-pointer content-center text-body-sm font-medium text-secondary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
        {hackathon_application_answers_reveal(
          { count: formatNumber(answers.length, locale) },
          options,
        )}
      </summary>
      {answers.length === 0 ? (
        <p className="mt-2 text-body-sm text-neutral">
          {hackathon_application_answers_empty({}, options)}
        </p>
      ) : (
        <dl className="mt-2 grid gap-3">
          {questions.map((question) => {
            const value = values.get(question.id);
            if (value === undefined) return null;
            const text = Array.isArray(value) ? value.join(', ') : value;
            return (
              <div key={question.id} className="grid gap-1">
                <dt className="text-body-xs text-neutral">
                  <bdi dir="auto">{question.label}</bdi>
                </dt>
                <dd className="break-words text-body-sm" dir="auto">
                  <bdi>{text}</bdi>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </details>
  );
};
