import { describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';

import {
  applicationAnswersCsv,
  checkApplicationAnswers,
  checkApplicationQuestions,
  type HackathonApplicationQuestion,
} from './application-answers';

const question = (
  changes: Partial<HackathonApplicationQuestion> = {},
): HackathonApplicationQuestion => ({
  id: id('qst'),
  scope: 'participant',
  type: 'short_text',
  label: 'What are you building?',
  isRequired: true,
  options: [],
  ...changes,
});

describe('application answer forms', () => {
  it('validates required answers and normalizes optional blanks', () => {
    const required = question();
    const optional = question({ isRequired: false });
    expect(
      checkApplicationAnswers([required], [], 'participant'),
    ).toMatchObject({
      ok: false,
      questionId: required.id,
      reason: 'required',
    });
    expect(
      checkApplicationAnswers(
        [optional],
        [{ questionId: optional.id, value: '   ' }],
        'participant',
      ),
    ).toEqual({ ok: true, answers: [] });
  });

  it('validates the organizer form structure before saving', () => {
    expect(checkApplicationQuestions([question()]).success).toBe(true);
    expect(
      checkApplicationQuestions([
        question({ type: 'single_choice', options: ['One'] }),
      ]).success,
    ).toBe(false);
  });

  it('escapes CSV cells and prevents spreadsheet formulas', () => {
    const prompt = question();
    const csv = applicationAnswersCsv(
      ['Name'],
      [prompt],
      [
        {
          fields: ['=HYPERLINK("https://example.org")'],
          answers: [{ questionId: prompt.id, value: 'A, "great" idea' }],
        },
      ],
    );
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.org"")"');
    expect(csv).toContain('"A, ""great"" idea"');
  });
});
