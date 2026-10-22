import { describe, expect, it } from 'vitest';

import { decideScoreSave, judgeScoresSchema } from './judge-scores.js';

const HOUR = 3_600_000;
const deadline = Date.parse('2099-01-17T18:00:00Z');
const timeline = {
  registrationOpensAt: deadline - 20 * 24 * HOUR,
  registrationClosesAt: deadline - 3 * 24 * HOUR,
  kickoffAt: deadline - 48 * HOUR,
  submissionDeadlineAt: deadline,
  endsAt: deadline + 24 * HOUR,
  judgingEndsAt: deadline + 72 * HOUR,
};
const [impact, craft] = [
  'crt_0123456789abcdef0123456789abcdef',
  'crt_fedcba9876543210fedcba9876543210',
];

const save = {
  timeline,
  now: deadline + HOUR,
  isCancelled: false,
  isResultsPublished: false,
  judge: 'accepted' as const,
  entry: 'submitted' as const,
  isRecused: false,
  criteria: [
    { id: impact, scale: 10 },
    { id: craft, scale: 5 },
  ],
  scores: [
    { criterionId: impact, value: 9, comment: null },
    { criterionId: craft, value: 5, comment: 'Clean code.' },
  ],
};

const codeOf = (result: ReturnType<typeof decideScoreSave>) =>
  result.ok ? null : result.error.code;

describe('saving scores (B-JDG-05)', () => {
  it('saves scores within each criterion’s scale while judging is open', () => {
    expect(decideScoreSave(save).ok).toBe(true);
    expect(
      codeOf(
        decideScoreSave({
          ...save,
          scores: [{ criterionId: craft, value: 6, comment: null }],
        }),
      ),
    ).toBe('score_out_of_range');
    expect(
      codeOf(
        decideScoreSave({
          ...save,
          scores: [
            {
              criterionId: 'crt_00000000000000000000000000000000',
              value: 3,
              comment: null,
            },
          ],
        }),
      ),
    ).toBe('criterion_not_found');
  });

  it('refuses a recused judge, an entry not submitted, and once the results are out', () => {
    expect(codeOf(decideScoreSave({ ...save, isRecused: true }))).toBe(
      'judge_recused',
    );
    expect(codeOf(decideScoreSave({ ...save, entry: 'disqualified' }))).toBe(
      'submission_not_found',
    );
    expect(codeOf(decideScoreSave({ ...save, isResultsPublished: true }))).toBe(
      'judging_closed',
    );
    expect(codeOf(decideScoreSave({ ...save, now: deadline - 1 }))).toBe(
      'judging_not_started',
    );
  });

  it('takes each criterion once, whole numbers from 1 to 10, and a blank comment as none', () => {
    const input = {
      eventId: 'evt_0123456789abcdef0123456789abcdef',
      submissionId: 'sub_0123456789abcdef0123456789abcdef',
      scores: [{ criterionId: impact, value: 7, comment: '  ' }],
    };
    expect(judgeScoresSchema.parse(input).scores[0]?.comment).toBeNull();
    for (const value of [0, 11, 7.5])
      expect(
        judgeScoresSchema.safeParse({
          ...input,
          scores: [{ criterionId: impact, value }],
        }).success,
      ).toBe(false);
    expect(
      judgeScoresSchema.safeParse({
        ...input,
        scores: [
          { criterionId: impact, value: 3 },
          { criterionId: impact, value: 4 },
        ],
      }).success,
    ).toBe(false);
  });
});
