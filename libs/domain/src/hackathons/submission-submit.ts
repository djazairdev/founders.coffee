import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  type HackathonAiPolicy,
  type HackathonSubmissionStatus,
  type Result,
} from '@founders-coffee/core';

import { decideDraftSave } from './submission-drafts.js';
import {
  checkSubmission,
  submissionSchema,
  type Submission,
} from './submissions.js';
import type { TeamMembership } from './teams.js';
import type { HackathonTimeline } from './timeline.js';

export const submissionSubmitSchema = z.strictObject({
  eventId: idSchema,
  version: z.number().int().min(1),
  isOriginalWorkAttested: z.literal(true, {
    error: 'The team must attest that the work is its own',
  }),
});

export type SubmissionSubmitInput = z.input<typeof submissionSubmitSchema>;

type SubmitEntry = {
  readonly status: HackathonSubmissionStatus;
  readonly version: number;
  readonly trackId: string | null;
  readonly title: string;
  readonly description: string;
  readonly repositoryUrl: string | null;
  readonly demoVideoUrl: string | null;
  readonly pullRequestUrls: readonly string[];
  readonly aiTools: readonly string[];
  readonly aiStatement: string | null;
};

/**
 * Decide whether the captain may submit the team's entry (B-SUB-04), as it stands: only the
 * captain, only while the team is building, and before the submission deadline by the server's
 * clock (`deadline_passed`). The entry has to be saved, at the version the captain saw
 * (`submission_conflict`), not disqualified (`submission_locked`), and complete by the submission's
 * own rules (`submission_incomplete`), with a track of this hackathon and, for an AI-native one,
 * the AI tools named.
 */
export const decideSubmit = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly membership: TeamMembership | null;
  readonly version: number;
  readonly entry: SubmitEntry | null;
  readonly hackathon: {
    readonly trackIds: readonly string[];
    readonly aiPolicy: HackathonAiPolicy;
  };
}): Result<Submission> => {
  const allowed = decideDraftSave(input);
  if (!allowed.ok) return allowed;
  const { entry } = input;
  if (entry === null)
    return err(
      new AppError('submission_incomplete', 'Save the entry before submitting'),
    );
  if (entry.version !== input.version)
    return err(
      new AppError(
        'submission_conflict',
        'The entry changed while you were editing it',
      ),
    );
  if (entry.status === 'disqualified')
    return err(
      new AppError('submission_locked', 'This entry can no longer change'),
    );
  const complete = submissionSchema.safeParse({
    trackId: entry.trackId,
    title: entry.title,
    description: entry.description,
    repositoryUrl: entry.repositoryUrl,
    demoVideoUrl: entry.demoVideoUrl,
    pullRequestUrls: entry.pullRequestUrls,
    aiTools: entry.aiTools,
    aiStatement: entry.aiStatement,
    isOriginalWorkAttested: true,
  });
  if (!complete.success)
    return err(
      new AppError(
        'submission_incomplete',
        'The entry is missing something a submission needs',
      ),
    );
  return checkSubmission(complete.data, input.hackathon);
};
