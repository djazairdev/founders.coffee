import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  type HackathonAiPolicy,
  type Result,
} from '@founders-coffee/core';

import { isCredentialFreeHttpsUrl } from '../profile/schemas.js';

export const SUBMISSION_PULL_REQUEST_LIMIT = 10;
export const SUBMISSION_AI_TOOL_LIMIT = 10;

const httpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isCredentialFreeHttpsUrl, 'A credential-free HTTPS URL is required');

export const submissionSchema = z.strictObject({
  trackId: idSchema,
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(20).max(2000),
  repositoryUrl: httpsUrlSchema,
  demoVideoUrl: httpsUrlSchema.nullable().default(null),
  pullRequestUrls: z
    .array(httpsUrlSchema)
    .max(SUBMISSION_PULL_REQUEST_LIMIT)
    .default([]),
  aiTools: z
    .array(z.string().trim().min(1).max(60))
    .max(SUBMISSION_AI_TOOL_LIMIT)
    .default([]),
  aiStatement: z.string().trim().min(20).max(1000),
  isOriginalWorkAttested: z.literal(true, {
    error: 'The team must attest that the work is its own',
  }),
});

export type Submission = z.infer<typeof submissionSchema>;

/**
 * Check a submission against its hackathon, once the schema has accepted its shape.
 *
 * The schema already holds what every hackathon asks: HTTPS links without credentials, the
 * original-work statement, and an AI statement saying what the team built itself, which the
 * product asks of every submission whatever the policy (V14). Two rules need the hackathon: the
 * track has to be one of its own, and an AI-native hackathon, built around AI tools, needs the tools
 * named. Under the other policies a team that used none says so in its statement.
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
  if (hackathon.aiPolicy === 'ai_native' && submission.aiTools.length === 0)
    return err(
      new AppError(
        'ai_tools_required',
        'An AI-native hackathon asks which AI tools were used',
      ),
    );
  return ok(submission);
};
