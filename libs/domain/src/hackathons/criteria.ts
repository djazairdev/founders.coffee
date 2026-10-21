import { z } from 'zod';

import { hackathonCriterionScaleSchema } from '@founders-coffee/core';

export const HACKATHON_CRITERIA_MIN = 3;
export const HACKATHON_CRITERIA_MAX = 4;
export const HACKATHON_WEIGHT_TOTAL = 100;

export const hackathonCriterionSchema = z.strictObject({
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().min(20).max(500),
  weight: z.number().int().min(1).max(HACKATHON_WEIGHT_TOTAL),
  scale: hackathonCriterionScaleSchema,
});

export type HackathonCriterionInput = z.infer<typeof hackathonCriterionSchema>;

/**
 * Hold a rubric to what V12 publishes: three or four criteria, each named once, whatever its case,
 * whose weights add up to 100.
 */
const addRubricIssues = (
  criteria: readonly HackathonCriterionInput[],
  context: z.RefinementCtx,
): void => {
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (total !== HACKATHON_WEIGHT_TOTAL)
    context.addIssue({
      code: 'custom',
      message: `The weights add up to ${total}, not ${HACKATHON_WEIGHT_TOTAL}`,
    });
  const names = criteria.map((criterion) => criterion.name.toLowerCase());
  if (new Set(names).size !== names.length)
    context.addIssue({ code: 'custom', message: 'Each criterion once' });
};

export const hackathonRubricSchema = z
  .array(hackathonCriterionSchema)
  .min(HACKATHON_CRITERIA_MIN)
  .max(HACKATHON_CRITERIA_MAX)
  .superRefine(addRubricIssues);
