import { describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';

import {
  checkHackathonApplicationAnswers,
  hackathonApplicationQuestionsSchema,
  type HackathonApplicationQuestion,
} from './application-questions.js';

const question = (
  changes: Partial<HackathonApplicationQuestion> = {},
): HackathonApplicationQuestion => ({
  id: id('qst'),
  scope: 'participant',
  type: 'short_text',
  label: 'What do you study?',
  isRequired: true,
  options: [],
  ...changes,
});

describe('hackathon application questions', () => {
  it('limits and validates choice questions and unique ids', () => {
    const first = question({
      type: 'single_choice',
      options: ['Student', 'Other'],
    });
    expect(hackathonApplicationQuestionsSchema.safeParse([first]).success).toBe(
      true,
    );
    expect(
      hackathonApplicationQuestionsSchema.safeParse([
        { ...first, options: ['Student'] },
      ]).success,
    ).toBe(false);
    expect(
      hackathonApplicationQuestionsSchema.safeParse([
        { ...question(), options: ['Extra'] },
      ]).success,
    ).toBe(false);
    expect(
      hackathonApplicationQuestionsSchema.safeParse([
        { ...first, options: ['Student', 'student'] },
      ]).success,
    ).toBe(false);
    expect(
      hackathonApplicationQuestionsSchema.safeParse([
        first,
        { ...first, label: 'A duplicate id' },
      ]).success,
    ).toBe(false);
  });

  it('requires answers and rejects answers from the other scope', () => {
    const participant = question();
    const team = question({ scope: 'team' });
    expect(
      checkHackathonApplicationAnswers([participant, team], [], 'participant'),
    ).toMatchObject({
      ok: false,
      questionId: participant.id,
      reason: 'required',
    });
    expect(
      checkHackathonApplicationAnswers(
        [participant, team],
        [{ questionId: team.id, value: 'shared proposal' }],
        'participant',
      ),
    ).toMatchObject({ ok: false, questionId: team.id, reason: 'unknown' });
  });

  it('rejects answers whose question was removed from the application form', () => {
    const retired = question({ isRequired: false });
    const current = question({ isRequired: false });
    expect(
      checkHackathonApplicationAnswers(
        [current],
        [{ questionId: retired.id, value: 'old answer' }],
        'participant',
      ),
    ).toMatchObject({ ok: false, questionId: retired.id, reason: 'unknown' });
  });

  it('normalizes optional empty answers and validates multi-choice values', () => {
    const optional = question({ isRequired: false });
    const choice = question({
      scope: 'team',
      type: 'multiple_choice',
      options: ['Web', 'Mobile'],
    });
    expect(
      checkHackathonApplicationAnswers(
        [optional],
        [{ questionId: optional.id, value: '  ' }],
        'participant',
      ),
    ).toEqual({ ok: true, answers: [] });
    expect(
      checkHackathonApplicationAnswers(
        [choice],
        [{ questionId: choice.id, value: ['Web', 'Web'] }],
        'team',
      ),
    ).toMatchObject({ ok: false, questionId: choice.id, reason: 'invalid' });
  });

  it('allows only HTTP(S) URLs and valid single-choice options', () => {
    const url = question({ type: 'url' });
    const choice = question({
      type: 'single_choice',
      options: ['Undergraduate', 'Graduate'],
    });
    expect(
      checkHackathonApplicationAnswers(
        [url],
        [{ questionId: url.id, value: 'javascript:alert(1)' }],
        'participant',
      ).ok,
    ).toBe(false);
    expect(
      checkHackathonApplicationAnswers(
        [choice],
        [{ questionId: choice.id, value: 'Doctorate' }],
        'participant',
      ).ok,
    ).toBe(false);
  });

  it('rejects malformed, duplicate, too-long, and non-URL answers', () => {
    const short = question({ isRequired: false });
    const long = question({ type: 'long_text', isRequired: false });
    const url = question({ type: 'url', isRequired: false });
    const multiple = question({
      type: 'multiple_choice',
      options: ['Web', 'Mobile'],
      isRequired: false,
    });
    expect(
      checkHackathonApplicationAnswers([short], {}, 'participant'),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    expect(
      checkHackathonApplicationAnswers(
        [short],
        [
          { questionId: short.id, value: 'one' },
          { questionId: short.id, value: 'two' },
        ],
        'participant',
      ),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    expect(
      checkHackathonApplicationAnswers(
        [short],
        [{ questionId: short.id, value: 'x'.repeat(301) }],
        'participant',
      ),
    ).toMatchObject({ ok: false, questionId: short.id, reason: 'invalid' });
    expect(
      checkHackathonApplicationAnswers(
        [long],
        [{ questionId: long.id, value: 'x'.repeat(2001) }],
        'participant',
      ),
    ).toMatchObject({ ok: false, questionId: long.id, reason: 'invalid' });
    expect(
      checkHackathonApplicationAnswers(
        [url],
        [{ questionId: url.id, value: 'not a URL' }],
        'participant',
      ),
    ).toMatchObject({ ok: false, questionId: url.id, reason: 'invalid' });
    expect(
      checkHackathonApplicationAnswers(
        [url],
        [{ questionId: url.id, value: `https://${'x'.repeat(2048)}` }],
        'participant',
      ),
    ).toMatchObject({ ok: false, questionId: null, reason: 'invalid' });
    expect(
      checkHackathonApplicationAnswers(
        [multiple],
        [{ questionId: multiple.id, value: ['Unknown'] }],
        'participant',
      ),
    ).toMatchObject({ ok: false, questionId: multiple.id, reason: 'invalid' });
  });

  it('accepts valid answers for each field type and defaults missing answers', () => {
    const short = question({ isRequired: false });
    const long = question({ type: 'long_text' });
    const url = question({ type: 'url' });
    const single = question({
      type: 'single_choice',
      options: ['Student', 'Graduate'],
    });
    const multiple = question({
      scope: 'team',
      type: 'multiple_choice',
      options: ['Web', 'Mobile'],
    });
    const questions = [short, long, url, single, multiple];
    const answers = [
      { questionId: short.id, value: 'Builder' },
      { questionId: long.id, value: 'A community tool' },
      { questionId: url.id, value: 'https://example.com/project' },
      { questionId: single.id, value: 'Student' },
      { questionId: multiple.id, value: ['Web', 'Mobile'] },
    ];
    expect(
      checkHackathonApplicationAnswers(
        questions,
        answers.slice(0, 4),
        'participant',
      ),
    ).toEqual({ ok: true, answers: answers.slice(0, 4) });
    expect(
      checkHackathonApplicationAnswers(questions, [answers[4]], 'team'),
    ).toEqual({ ok: true, answers: [answers[4]] });
    expect(
      hackathonApplicationQuestionsSchema.safeParse(
        Array.from({ length: 13 }, () => question()),
      ).success,
    ).toBe(false);
    expect(
      checkHackathonApplicationAnswers(
        [question({ isRequired: false })],
        undefined,
        'participant',
      ),
    ).toEqual({ ok: true, answers: [] });
  });
});
