import { describe, expect, it } from 'vitest';

import { draftView, savedDetails } from './hackathon-details-form.fixtures';
import {
  checkRubric,
  criterionFieldId,
  emptyCriterion,
  initialRubric,
  rubricTotal,
  type CriterionDraft,
} from './hackathon-rubric-form';

const criterion = (
  key: string,
  name: string,
  weight: string,
): CriterionDraft => ({
  ...emptyCriterion(key),
  name,
  description: `How well the project does on ${name.toLowerCase()}.`,
  weight,
});

const rubric = [
  criterion('a', 'Impact', '40'),
  criterion('b', 'Craft', '30'),
  criterion('c', 'Demo', '30'),
];

describe('initialRubric (B-HKN-15)', () => {
  it('opens on three blank criteria scored out of 10, or on the saved rubric and its scale', () => {
    let key = 0;
    const newKey = () => `new-${(key += 1)}`;

    expect(initialRubric(draftView({ details: savedDetails }), newKey)).toEqual(
      {
        criteria: [
          emptyCriterion('new-1'),
          emptyCriterion('new-2'),
          emptyCriterion('new-3'),
        ],
        scale: 10,
      },
    );
    expect(
      initialRubric(
        draftView({
          criteria: [
            {
              id: 'crt_1',
              name: 'Impact',
              description: 'Who it helps, and how much.',
              weight: 100,
              scale: 5,
            },
          ],
        }),
        newKey,
      ),
    ).toEqual({
      criteria: [
        {
          key: 'crt_1',
          id: 'crt_1',
          name: 'Impact',
          description: 'Who it helps, and how much.',
          weight: '100',
        },
      ],
      scale: 5,
    });
  });
});

describe('checkRubric (B-HKN-15)', () => {
  it('sends every criterion on the one scale once the weights reach 100', () => {
    expect(rubricTotal(rubric)).toBe(100);
    expect(checkRubric(rubric, 5, 'en')).toEqual({
      ok: true,
      criteria: rubric.map((draft) => ({
        id: null,
        criterion: {
          name: draft.name,
          description: draft.description,
          weight: Number(draft.weight),
          scale: 5,
        },
      })),
    });
  });

  it('names each criterion’s fields first, and where to go', () => {
    const checked = checkRubric(
      [rubric[0] as CriterionDraft, { ...emptyCriterion('b'), weight: '2.5' }],
      10,
      'en',
    );

    expect(checked.ok ? null : checked.errors).toEqual({
      b: {
        name: 'Name the criterion in 3 to 60 characters.',
        description: 'Describe it in 20 to 500 characters.',
        weight: 'Enter a whole number from 1 to 100.',
      },
    });
    expect(checked.ok ? null : checked.first).toBe(
      criterionFieldId('b', 'name'),
    );
  });

  it('holds the whole rubric to 100, then to a name each, in the reader’s language', () => {
    const short = checkRubric(
      [...rubric.slice(0, 2), criterion('c', 'Demo', '20')],
      10,
      'fr',
    );
    const twice = checkRubric(
      [...rubric.slice(0, 2), criterion('c', 'impact', '30')],
      10,
      'ar',
    );

    expect(short.ok ? null : short.rubricError).toBe(
      'Les poids font 90 au total. Ils doivent faire 100.',
    );
    expect(short.ok ? null : short.first).toBe(criterionFieldId('a', 'weight'));
    expect(twice.ok ? null : twice.rubricError).toBe(
      'أعطِ كل معيار اسمًا مختلفًا.',
    );
  });
});
