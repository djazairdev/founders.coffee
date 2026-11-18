import type { HackathonCriterionScale } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import {
  hackathon_criterion_error_description,
  hackathon_criterion_error_name,
  hackathon_criterion_error_weight,
  hackathon_rubric_error_names,
  hackathon_rubric_error_total,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonDraftView, SaveHackathonRubricRequest } from './api';

export const CRITERIA_MIN = hackathons.HACKATHON_CRITERIA_MIN;
export const CRITERIA_MAX = hackathons.HACKATHON_CRITERIA_MAX;
export const WEIGHT_TOTAL = hackathons.HACKATHON_WEIGHT_TOTAL;

export type CriterionDraft = {
  readonly key: string;
  readonly id: string | null;
  readonly name: string;
  readonly description: string;
  readonly weight: string;
};

export type CriterionField = 'name' | 'description' | 'weight';

export type RubricErrors = Readonly<
  Record<string, Partial<Record<CriterionField, string>>>
>;

export type RubricCheck =
  | {
      readonly ok: true;
      readonly criteria: SaveHackathonRubricRequest['criteria'];
    }
  | {
      readonly ok: false;
      readonly errors: RubricErrors;
      readonly rubricError: string | null;
      readonly first: string | null;
    };

/** The id of a criterion's field, for its label and for taking the organiser there. */
export const criterionFieldId = (key: string, field: CriterionField) =>
  `hackathon-criterion-${key}-${field}`;

/** A blank criterion. */
export const emptyCriterion = (key: string): CriterionDraft => ({
  key,
  id: null,
  name: '',
  description: '',
  weight: '',
});

/** The rubric as the form opens on it: the saved criteria, or as many blank ones as a rubric needs. */
export const initialRubric = (
  draft: HackathonDraftView,
  newKey: () => string,
): { criteria: CriterionDraft[]; scale: HackathonCriterionScale } => ({
  criteria:
    draft.criteria.length > 0
      ? draft.criteria.map((criterion) => ({
          key: criterion.id,
          id: criterion.id,
          name: criterion.name,
          description: criterion.description,
          weight: String(criterion.weight),
        }))
      : Array.from({ length: CRITERIA_MIN }, () => emptyCriterion(newKey())),
  scale: draft.criteria[0]?.scale ?? 10,
});

const weightOf = (value: string): number | null => {
  const weight = Number(value);
  return value.trim() !== '' && Number.isInteger(weight) ? weight : null;
};

/** What the weights add up to so far, counting only those that are whole numbers. */
export const rubricTotal = (criteria: readonly CriterionDraft[]): number =>
  criteria.reduce(
    (sum, criterion) => sum + (weightOf(criterion.weight) ?? 0),
    0,
  );

const FIELD_MESSAGES = {
  name: hackathon_criterion_error_name,
  description: hackathon_criterion_error_description,
  weight: hackathon_criterion_error_weight,
} as const;

const FIELD_ORDER: readonly CriterionField[] = [
  'name',
  'description',
  'weight',
];

/**
 * Check a rubric with the rules the server holds it to: each criterion on its own, then the whole
 * rubric, whose weights add up to 100 and whose criteria are each named once. Either send it as the
 * server takes it, every criterion on the one scale, or name what holds it back and where to go.
 */
export const checkRubric = (
  criteria: readonly CriterionDraft[],
  scale: HackathonCriterionScale,
  locale: Locale,
): RubricCheck => {
  const errors: Record<string, Partial<Record<CriterionField, string>>> = {};
  let first: string | null = null;
  const parsed = criteria.map((draft) => {
    const result = hackathons.hackathonCriterionSchema.safeParse({
      name: draft.name,
      description: draft.description,
      weight: weightOf(draft.weight),
      scale,
    });
    if (result.success) return { id: draft.id, criterion: result.data };
    const fields: Partial<Record<CriterionField, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as CriterionField;
      if (field in FIELD_MESSAGES)
        fields[field] = FIELD_MESSAGES[field]({}, { locale });
    }
    errors[draft.key] = fields;
    const field = FIELD_ORDER.find((candidate) => fields[candidate]);
    if (field) first ??= criterionFieldId(draft.key, field);
    return null;
  });
  if (first) return { ok: false, errors, rubricError: null, first };
  const total = rubricTotal(criteria);
  const names = criteria.map((draft) => draft.name.trim().toLowerCase());
  const rubricError =
    total !== WEIGHT_TOTAL
      ? hackathon_rubric_error_total({ total }, { locale })
      : new Set(names).size !== names.length
        ? hackathon_rubric_error_names({}, { locale })
        : null;
  if (rubricError)
    return {
      ok: false,
      errors,
      rubricError,
      first: criterionFieldId(
        criteria[0]?.key ?? '',
        total !== WEIGHT_TOTAL ? 'weight' : 'name',
      ),
    };
  return {
    ok: true,
    criteria: parsed.flatMap((checked) => (checked ? [checked] : [])),
  };
};
