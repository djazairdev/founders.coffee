import { z } from 'zod';

import { idSchema } from '@founders-coffee/core';

export const HACKATHON_APPLICATION_QUESTION_LIMIT = 12;
export const HACKATHON_APPLICATION_QUESTION_LABEL_MAX = 160;
export const HACKATHON_APPLICATION_ANSWER_TEXT_MAX = 2000;

export const hackathonApplicationQuestionScopeSchema = z.enum([
  'participant',
  'team',
]);

export const hackathonApplicationQuestionTypeSchema = z.enum([
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'url',
]);

const optionSchema = z.string().trim().min(1).max(100);

export const hackathonApplicationQuestionSchema = z
  .strictObject({
    id: idSchema,
    scope: hackathonApplicationQuestionScopeSchema,
    type: hackathonApplicationQuestionTypeSchema,
    label: z
      .string()
      .trim()
      .min(1)
      .max(HACKATHON_APPLICATION_QUESTION_LABEL_MAX),
    isRequired: z.boolean(),
    options: z.array(optionSchema).max(10).default([]),
  })
  .superRefine((question, context) => {
    const isChoice =
      question.type === 'single_choice' || question.type === 'multiple_choice';
    if (isChoice && question.options.length < 2)
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Choice questions need at least two options',
      });
    if (!isChoice && question.options.length > 0)
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Only choice questions can have options',
      });
    if (
      new Set(question.options.map((option) => option.toLowerCase())).size !==
      question.options.length
    )
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Choice options must be unique',
      });
  });

export const hackathonApplicationQuestionsSchema = z
  .array(hackathonApplicationQuestionSchema)
  .max(HACKATHON_APPLICATION_QUESTION_LIMIT)
  .refine(
    (questions) =>
      new Set(questions.map(({ id }) => id)).size === questions.length,
    'Question ids must be unique',
  );

const answerValueSchema = z.union([
  z.string().trim().max(2048),
  z.array(optionSchema).max(10),
]);

export const hackathonApplicationAnswersSchema = z
  .array(
    z.strictObject({
      questionId: idSchema,
      value: answerValueSchema,
    }),
  )
  .max(HACKATHON_APPLICATION_QUESTION_LIMIT)
  .refine(
    (answers) =>
      new Set(answers.map(({ questionId }) => questionId)).size ===
      answers.length,
    'Each question can have one answer',
  );

export type HackathonApplicationQuestion = z.infer<
  typeof hackathonApplicationQuestionSchema
>;
export type HackathonApplicationQuestionScope = z.infer<
  typeof hackathonApplicationQuestionScopeSchema
>;
export type HackathonApplicationQuestionType = z.infer<
  typeof hackathonApplicationQuestionTypeSchema
>;
export type HackathonApplicationAnswer = z.infer<
  typeof hackathonApplicationAnswersSchema
>[number];

export type ApplicationAnswerCheck =
  | {
      readonly ok: true;
      readonly answers: readonly HackathonApplicationAnswer[];
    }
  | {
      readonly ok: false;
      readonly questionId: string | null;
      readonly reason: 'required' | 'invalid' | 'unknown';
    };

const nonEmpty = (value: string | readonly string[] | undefined) =>
  typeof value === 'string'
    ? value.trim().length > 0
    : Array.isArray(value) && value.length > 0;

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const answerMatchesQuestion = (
  question: HackathonApplicationQuestion,
  value: string | readonly string[],
) => {
  if (question.type === 'short_text')
    return typeof value === 'string' && value.length <= 300;
  if (question.type === 'long_text')
    return (
      typeof value === 'string' &&
      value.length <= HACKATHON_APPLICATION_ANSWER_TEXT_MAX
    );
  if (question.type === 'url')
    return typeof value === 'string' && isValidUrl(value);
  if (question.type === 'single_choice')
    return typeof value === 'string' && question.options.includes(value);
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every((option) => question.options.includes(option))
  );
};

/** Check and normalize answers for one scope against the organiser's current question set. */
export const checkHackathonApplicationAnswers = (
  questions: readonly HackathonApplicationQuestion[],
  rawAnswers: unknown,
  scope: HackathonApplicationQuestionScope,
): ApplicationAnswerCheck => {
  const parsed = hackathonApplicationAnswersSchema.safeParse(
    rawAnswers === undefined ? [] : rawAnswers,
  );
  if (!parsed.success)
    return { ok: false, questionId: null, reason: 'invalid' };
  const scopedQuestions = questions.filter(
    (question) => question.scope === scope,
  );
  const questionIds = new Set(scopedQuestions.map(({ id }) => id));
  const answersById = new Map(
    parsed.data.map((answer) => [answer.questionId, answer.value]),
  );
  const unknownAnswer = parsed.data.find(
    ({ questionId }) => !questionIds.has(questionId),
  );
  if (unknownAnswer)
    return {
      ok: false,
      questionId: unknownAnswer.questionId,
      reason: 'unknown',
    };
  const answers: HackathonApplicationAnswer[] = [];
  for (const question of scopedQuestions) {
    const value = answersById.get(question.id);
    if (value === undefined || !nonEmpty(value)) {
      if (question.isRequired)
        return {
          ok: false,
          questionId: question.id,
          reason: 'required',
        };
      continue;
    }
    if (!answerMatchesQuestion(question, value))
      return {
        ok: false,
        questionId: question.id,
        reason: 'invalid',
      };
    answers.push({ questionId: question.id, value });
  }
  return { ok: true, answers };
};
