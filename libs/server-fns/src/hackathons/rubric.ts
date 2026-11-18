import { z } from 'zod';

import { AppError, err, id, type Result } from '@founders-coffee/core';
import {
  hackathonRubricWrites,
  listHackathonCriteria,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  hackathonDetailsRequired,
  loadHackathonEdit,
  runHackathonEdit,
} from './edit-context.js';

export type HackathonCriterionSave = {
  readonly id: string | null;
  readonly criterion: hackathons.HackathonCriterionInput;
};

/**
 * Save a hackathon's judging rubric (B-HKN-15, B-HKN-07): three or four criteria whose weights add
 * up to 100, in the organiser's order, each keeping its id when it has one.
 *
 * The rubric is what teams are judged by, so it changes only before registration opens; after,
 * the answer is `hackathon_field_locked`. The write lands only on the version the organiser saw,
 * with the version bump, and answers the new version.
 */
export const saveHackathonRubricResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly organisationId: string;
    readonly criteria: readonly HackathonCriterionSave[];
  },
  now: number = Date.now(),
): Promise<Result<{ readonly eventId: string; readonly version: number }>> => {
  const loaded = await loadHackathonEdit(db, input, now);
  if (!loaded.ok) return loaded;
  if (!loaded.data.details) return hackathonDetailsRequired();
  if (!hackathons.isRubricEditable(loaded.data.stage))
    return err(
      new AppError(
        'hackathon_field_locked',
        'Registration has opened, so the rubric cannot change',
        { fields: ['criteria'] },
      ),
    );
  const checked = hackathons.hackathonRubricSchema.safeParse(
    input.criteria.map((saved) => saved.criterion),
  );
  if (!checked.success)
    return err(
      new AppError('validation_failed', 'The rubric does not add up', {
        formErrors: z.flattenError(checked.error).formErrors,
      }),
    );
  const ids = input.criteria.flatMap((saved) => (saved.id ? [saved.id] : []));
  const savedIds = new Set(
    (await listHackathonCriteria(db, input.eventId)).map((saved) => saved.id),
  );
  if (
    new Set(ids).size !== ids.length ||
    !ids.every((criterionId) => savedIds.has(criterionId))
  )
    return err(
      new AppError('validation_failed', 'Each criterion of this rubric once'),
    );
  return runHackathonEdit(db, loaded.data, {
    operation: 'hackathon_rubric_saved',
    organisationId: input.organisationId,
    writes: hackathonRubricWrites(db, {
      eventId: input.eventId,
      version: input.version,
      criteria: checked.data.map((criterion, index) => ({
        id: input.criteria[index]?.id ?? id('crt'),
        criterion,
      })),
    }),
  });
};
