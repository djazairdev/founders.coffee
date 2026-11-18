import { z } from 'zod';

import {
  AppError,
  err,
  HACKATHON_SUBMISSION_AI_STATEMENT_MAX,
  HACKATHON_SUBMISSION_DESCRIPTION_MAX,
  HACKATHON_SUBMISSION_TITLE_MAX,
  idSchema,
  ok,
  type HackathonSubmissionStatus,
  type Result,
} from '@founders-coffee/core';

import {
  SUBMISSION_AI_TOOL_LIMIT,
  SUBMISSION_PULL_REQUEST_LIMIT,
  submissionUrlSchema,
} from './submissions.js';
import type { TeamMembership } from './teams.js';
import { phaseAt, type HackathonTimeline } from './timeline.js';

const emptyAsNull = (value: string) => value || null;

export const submissionDraftSchema = z.strictObject({
  trackId: idSchema.nullable().default(null),
  title: z.string().trim().min(1).max(HACKATHON_SUBMISSION_TITLE_MAX),
  description: z
    .string()
    .trim()
    .max(HACKATHON_SUBMISSION_DESCRIPTION_MAX)
    .default(''),
  repositoryUrl: submissionUrlSchema.nullable().default(null),
  demoVideoUrl: submissionUrlSchema.nullable().default(null),
  pullRequestUrls: z
    .array(submissionUrlSchema)
    .max(SUBMISSION_PULL_REQUEST_LIMIT)
    .default([]),
  aiTools: z
    .array(z.string().trim().min(1).max(60))
    .max(SUBMISSION_AI_TOOL_LIMIT)
    .default([]),
  aiStatement: z
    .string()
    .trim()
    .max(HACKATHON_SUBMISSION_AI_STATEMENT_MAX)
    .transform(emptyAsNull)
    .nullable()
    .default(null),
});

export type SubmissionDraft = z.infer<typeof submissionDraftSchema>;

export const submissionDraftSaveSchema = z.strictObject({
  eventId: idSchema,
  version: z.number().int().min(0),
  draft: submissionDraftSchema,
});

export type SubmissionDraftSaveInput = z.input<
  typeof submissionDraftSaveSchema
>;

/**
 * Decide whether a member can save their team's submission draft (B-SUB-03): only its captain, and
 * only while the team is building, from kickoff until the submission deadline. A version of 0 says
 * the team has no submission yet.
 */
export const decideDraftSave = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly membership: TeamMembership | null;
}): Result<true> => {
  const phase = phaseAt(input.timeline, input.now);
  if (phase === 'judging' || phase === 'results')
    return err(new AppError('deadline_passed', 'The deadline has passed'));
  if (phase !== 'building')
    return err(
      new AppError('building_not_started', 'Building starts at kickoff'),
    );
  if (input.membership === null || !input.membership.isCaptain)
    return err(
      new AppError('not_team_captain', 'Only the captain saves the entry'),
    );
  return ok(true);
};

/**
 * Decide whether a saved draft may replace what the team has (B-SUB-03). A disqualified entry
 * stays as it was. An entry already submitted stays submitted, and judges keep its last snapshot
 * until the team submits again, so the draft has to stay complete: a track, a repository and an AI
 * statement.
 */
export const decideDraftReplace = (
  status: HackathonSubmissionStatus,
  draft: SubmissionDraft,
): Result<true> => {
  if (status === 'disqualified')
    return err(
      new AppError('submission_locked', 'This entry can no longer change'),
    );
  if (
    status === 'submitted' &&
    (draft.trackId === null ||
      draft.repositoryUrl === null ||
      draft.aiStatement === null)
  )
    return err(
      new AppError(
        'submission_incomplete',
        'A submitted entry keeps its track, repository and AI statement',
      ),
    );
  return ok(true);
};
