import { AppError, err, type Result } from '@founders-coffee/core';
import {
  hackathonApplicationQuestionsUpdate,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { loadHackathonEdit, runHackathonEdit } from './edit-context.js';

export type SaveHackathonApplicationQuestionsInput = {
  readonly eventId: string;
  readonly version: number;
  readonly organisationId: string;
  readonly questions: readonly hackathons.HackathonApplicationQuestion[];
};

export type HackathonApplicationQuestionsSaved = {
  readonly eventId: string;
  readonly version: number;
};

/** Save the organiser's application questions before registration opens (#549). */
export const saveHackathonApplicationQuestionsResolver = async (
  db: Db,
  input: SaveHackathonApplicationQuestionsInput,
  now: number = Date.now(),
): Promise<Result<HackathonApplicationQuestionsSaved>> => {
  const loaded = await loadHackathonEdit(db, input, now);
  if (!loaded.ok) return loaded;
  const opensAt = loaded.data.rows.details?.registrationOpensAt;
  if (!opensAt)
    return err(
      new AppError(
        'hackathon_save_failed',
        'Save the registration dates before adding application questions',
      ),
    );
  if (opensAt.getTime() <= now)
    return err(
      new AppError(
        'hackathon_field_locked',
        'Application questions cannot change after registration opens',
      ),
    );
  const checked = hackathons.hackathonApplicationQuestionsSchema.safeParse(
    input.questions,
  );
  if (!checked.success)
    return err(
      new AppError('validation_failed', 'Check the application questions', {
        issues: checked.error.issues.map((issue) => ({ path: issue.path })),
      }),
    );
  return runHackathonEdit(db, loaded.data, {
    operation: 'hackathon_application_questions_saved',
    organisationId: input.organisationId,
    writes: [
      hackathonApplicationQuestionsUpdate(db, {
        eventId: input.eventId,
        version: input.version,
        questionsJson: JSON.stringify(checked.data),
      }),
    ],
    isSingleRow: true,
  });
};
