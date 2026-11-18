import { describe, expect, it } from 'vitest';

import { hackathonCriterionSchema, hackathonRubricSchema } from './criteria.js';

const criterion = (name: string, weight: number, scale = 10) => ({
  name,
  description: `How well the team did on ${name.toLowerCase()}.`,
  weight,
  scale,
});

const rubric = [
  criterion('Impact', 40),
  criterion('Execution', 35),
  criterion('Presentation', 25, 5),
];

describe('judging criteria (B-HKN-05)', () => {
  it('takes three or four criteria whose weights add up to 100', () => {
    expect(hackathonRubricSchema.safeParse(rubric).success).toBe(true);
    expect(
      hackathonRubricSchema.safeParse([
        criterion('Impact', 25),
        criterion('Execution', 25),
        criterion('Presentation', 25),
        criterion('Originality', 25, 5),
      ]).success,
    ).toBe(true);
  });

  it('refuses fewer than three or more than four', () => {
    expect(
      hackathonRubricSchema.safeParse([
        criterion('Impact', 50),
        criterion('Execution', 50),
      ]).success,
    ).toBe(false);
    expect(
      hackathonRubricSchema.safeParse([
        criterion('Impact', 20),
        criterion('Execution', 20),
        criterion('Presentation', 20),
        criterion('Originality', 20),
        criterion('Design', 20),
      ]).success,
    ).toBe(false);
  });

  it('refuses weights that do not add up to 100', () => {
    const result = hackathonRubricSchema.safeParse([
      criterion('Impact', 40),
      criterion('Execution', 35),
      criterion('Presentation', 20),
    ]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'The weights add up to 95, not 100',
    );
  });

  it('names each criterion once, whatever its case', () => {
    expect(
      hackathonRubricSchema.safeParse([
        criterion('Impact', 40),
        criterion('impact', 35),
        criterion('Presentation', 25),
      ]).success,
    ).toBe(false);
  });

  it('scores on a scale of 5 or 10, with a whole weight from 1 to 100', () => {
    expect(
      hackathonCriterionSchema.safeParse(criterion('Impact', 40, 7)).success,
    ).toBe(false);
    expect(
      hackathonCriterionSchema.safeParse(criterion('Impact', 0)).success,
    ).toBe(false);
    expect(
      hackathonCriterionSchema.safeParse(criterion('Impact', 33.5)).success,
    ).toBe(false);
    expect(
      hackathonCriterionSchema.safeParse(criterion('Impact', 40, 5)).success,
    ).toBe(true);
  });

  it('refuses a short name or description, and unknown fields', () => {
    expect(
      hackathonCriterionSchema.safeParse({ ...criterion('UX', 40) }).success,
    ).toBe(false);
    expect(
      hackathonCriterionSchema.safeParse({
        ...criterion('Impact', 40),
        description: 'Impact.',
      }).success,
    ).toBe(false);
    expect(
      hackathonCriterionSchema.safeParse({
        ...criterion('Impact', 40),
        position: 1,
      }).success,
    ).toBe(false);
  });
});
