import {
  hackathon_criterion_description,
  hackathon_criterion_name,
  hackathon_criterion_number,
  hackathon_criterion_remove,
  hackathon_criterion_weight,
  hackathon_remove,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, fieldNoteId, FormField, Input } from '@founders-coffee/ui';

import {
  criterionFieldId,
  WEIGHT_TOTAL,
  type CriterionDraft,
} from '../hackathon-rubric-form';
import type { useHackathonRubricForm } from '../useHackathonRubricForm';

export const HackathonCriterionEditor = ({
  form,
  criterion,
  index,
  locale,
}: {
  form: ReturnType<typeof useHackathonRubricForm>;
  criterion: CriterionDraft;
  index: number;
  locale: Locale;
}) => {
  const n = index + 1;
  const errors = form.errors[criterion.key];
  const headingId = `hackathon-criterion-${criterion.key}-heading`;
  const nameId = criterionFieldId(criterion.key, 'name');
  const descriptionId = criterionFieldId(criterion.key, 'description');
  const weightId = criterionFieldId(criterion.key, 'weight');
  const described = (id: string, error: string | undefined) => ({
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? fieldNoteId(id) : undefined,
  });

  return (
    <li
      aria-labelledby={headingId}
      className="grid gap-4 rounded-box border border-base-300 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="font-display text-h5">
          {hackathon_criterion_number({ n }, { locale })}
        </h3>
        {form.canRemove ? (
          <Button
            variant="ghost"
            aria-label={hackathon_criterion_remove({ n }, { locale })}
            onClick={() => form.remove(criterion.key)}
          >
            {hackathon_remove({}, { locale })}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-4">
        <FormField
          id={nameId}
          label={hackathon_criterion_name({}, { locale })}
          optionalLabel={optional({}, { locale })}
          error={errors?.name}
        >
          <Input
            id={nameId}
            dir="auto"
            maxLength={60}
            value={criterion.name}
            {...described(nameId, errors?.name)}
            onChange={(event) =>
              form.set(criterion.key, 'name')(event.target.value)
            }
          />
        </FormField>
        <FormField
          id={weightId}
          label={hackathon_criterion_weight({}, { locale })}
          optionalLabel={optional({}, { locale })}
          error={errors?.weight}
        >
          <Input
            id={weightId}
            type="number"
            inputMode="numeric"
            min={1}
            max={WEIGHT_TOTAL}
            value={criterion.weight}
            {...described(weightId, errors?.weight)}
            onChange={(event) =>
              form.set(criterion.key, 'weight')(event.target.value)
            }
          />
        </FormField>
      </div>
      <FormField
        id={descriptionId}
        label={hackathon_criterion_description({}, { locale })}
        optionalLabel={optional({}, { locale })}
        error={errors?.description}
      >
        <textarea
          id={descriptionId}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={3}
          dir="auto"
          maxLength={500}
          value={criterion.description}
          {...described(descriptionId, errors?.description)}
          onChange={(event) =>
            form.set(criterion.key, 'description')(event.target.value)
          }
        />
      </FormField>
    </li>
  );
};
