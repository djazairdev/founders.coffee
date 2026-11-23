import { hackathons } from '@founders-coffee/domain';

export type HackathonApplicationAnswer = hackathons.HackathonApplicationAnswer;
export type HackathonApplicationQuestion =
  hackathons.HackathonApplicationQuestion;
export type HackathonApplicationQuestionScope =
  hackathons.HackathonApplicationQuestionScope;
export const HACKATHON_APPLICATION_QUESTION_LIMIT =
  hackathons.HACKATHON_APPLICATION_QUESTION_LIMIT;

export const checkApplicationAnswers = (
  questions: readonly HackathonApplicationQuestion[],
  answers: unknown,
  scope: HackathonApplicationQuestionScope,
) => hackathons.checkHackathonApplicationAnswers(questions, answers, scope);

export const checkApplicationQuestions = (questions: unknown) =>
  hackathons.hackathonApplicationQuestionsSchema.safeParse(questions);

export const applicationAnswersCsv = (
  baseHeaders: readonly string[],
  questions: readonly HackathonApplicationQuestion[],
  rows: readonly {
    readonly fields: readonly string[];
    readonly answers: readonly HackathonApplicationAnswer[];
  }[],
) => {
  const escape = (raw: string) => {
    const safe = /^\s*[=+\-@\t\r]/u.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const values = [
    [...baseHeaders, ...questions.map(({ label }) => label)],
    ...rows.map(({ fields, answers }) => {
      const byId = new Map(
        answers.map(({ questionId, value }) => [
          questionId,
          Array.isArray(value) ? value.join(', ') : value,
        ]),
      );
      return [
        ...fields,
        ...questions.map(({ id: questionId }) => byId.get(questionId) ?? ''),
      ];
    }),
  ];
  return `\uFEFF${values.map((row) => row.map(escape).join(',')).join('\r\n')}`;
};

export const downloadApplicationAnswersCsv = (
  content: string,
  fileName: string,
) => {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
