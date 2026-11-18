import { z } from 'zod';

import {
  AppError,
  err,
  HACKATHON_SUBMISSION_AI_STATEMENT_MAX,
  HACKATHON_SUBMISSION_AI_TOOL_MAX,
  HACKATHON_SUBMISSION_DESCRIPTION_MAX,
  HACKATHON_SUBMISSION_PULL_REQUEST_MAX,
  HACKATHON_SUBMISSION_TITLE_MAX,
  HACKATHON_SUBMISSION_URL_MAX,
  idSchema,
  ok,
  type HackathonAiPolicy,
  type Result,
} from '@founders-coffee/core';

import { isCredentialFreeHttpsUrl } from '../profile/schemas.js';

export const SUBMISSION_PULL_REQUEST_LIMIT =
  HACKATHON_SUBMISSION_PULL_REQUEST_MAX;
export const SUBMISSION_AI_TOOL_LIMIT = HACKATHON_SUBMISSION_AI_TOOL_MAX;

export const submissionUrlSchema = z
  .string()
  .trim()
  .max(HACKATHON_SUBMISSION_URL_MAX)
  .refine(isCredentialFreeHttpsUrl, 'A credential-free HTTPS URL is required');

export const submissionSchema = z.strictObject({
  trackId: idSchema,
  title: z.string().trim().min(3).max(HACKATHON_SUBMISSION_TITLE_MAX),
  description: z
    .string()
    .trim()
    .min(20)
    .max(HACKATHON_SUBMISSION_DESCRIPTION_MAX),
  repositoryUrl: submissionUrlSchema,
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
    .min(20)
    .max(HACKATHON_SUBMISSION_AI_STATEMENT_MAX),
  isOriginalWorkAttested: z.literal(true, {
    error: 'The team must attest that the work is its own',
  }),
});

export type Submission = z.infer<typeof submissionSchema>;

export const checkAiToolsPolicy = (
  aiTools: readonly string[],
  aiPolicy: HackathonAiPolicy,
): Result<readonly string[]> =>
  aiPolicy === 'not_allowed' && aiTools.length > 0
    ? err(
        new AppError(
          'ai_tools_not_allowed',
          'This hackathon does not allow AI tools',
        ),
      )
    : ok(aiTools);

/**
 * Check a submission against its hackathon, once the schema has accepted its shape.
 *
 * The schema already holds what every hackathon asks: HTTPS links without credentials, the
 * original-work statement, and an AI statement saying what the team built itself, which the
 * product asks of every submission whatever the policy (V14). Two rules need the hackathon: the
 * track has to be one of its own, and a hackathon that prohibits AI tools rejects submissions
 * naming any. Every team still describes its use of AI, including when none was used.
 */
export const checkSubmission = (
  submission: Submission,
  hackathon: {
    readonly trackIds: readonly string[];
    readonly aiPolicy: HackathonAiPolicy;
  },
): Result<Submission> => {
  if (!hackathon.trackIds.includes(submission.trackId))
    return err(
      new AppError(
        'track_not_in_hackathon',
        'The track is not one of this hackathon',
      ),
    );
  const toolsAllowed = checkAiToolsPolicy(
    submission.aiTools,
    hackathon.aiPolicy,
  );
  if (!toolsAllowed.ok) return toolsAllowed;
  return ok(submission);
};
