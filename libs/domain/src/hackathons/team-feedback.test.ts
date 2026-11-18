import { describe, expect, it } from 'vitest';

import { teamFeedbackOf } from './team-feedback.js';

const CRITERIA = [
  { criterionId: 'cri_impact', name: 'Impact', scale: 10 },
  { criterionId: 'cri_craft', name: 'Craft', scale: 5 },
];

describe('teamFeedbackOf', () => {
  it('numbers the judges and keeps each one’s scores in the rubric’s order', () => {
    const feedback = teamFeedbackOf('Ledger', CRITERIA, [
      {
        judgeId: 'jdg_b',
        criterionId: 'cri_craft',
        value: 3,
        comment: 'Tidy.',
      },
      {
        judgeId: 'jdg_b',
        criterionId: 'cri_impact',
        value: 7,
        comment: null,
      },
      {
        judgeId: 'jdg_a',
        criterionId: 'cri_impact',
        value: 9,
        comment: 'Useful.',
      },
    ]);

    expect(feedback).toEqual({
      title: 'Ledger',
      judges: [
        {
          number: 1,
          scores: [
            {
              criterionId: 'cri_impact',
              name: 'Impact',
              scale: 10,
              value: 9,
              comment: 'Useful.',
            },
          ],
        },
        {
          number: 2,
          scores: [
            {
              criterionId: 'cri_impact',
              name: 'Impact',
              scale: 10,
              value: 7,
              comment: null,
            },
            {
              criterionId: 'cri_craft',
              name: 'Craft',
              scale: 5,
              value: 3,
              comment: 'Tidy.',
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(feedback)).not.toContain('jdg_');
  });

  it('has no judges when nobody scored the entry', () => {
    expect(teamFeedbackOf('Ledger', CRITERIA, [])).toEqual({
      title: 'Ledger',
      judges: [],
    });
  });
});
