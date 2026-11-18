import { z } from 'zod';

import {
  AppError,
  err,
  idSchema,
  ok,
  type HackathonSubmissionStatus,
  type Result,
} from '@founders-coffee/core';

import { decideDraftSave } from './submission-drafts.js';
import type { TeamMembership } from './teams.js';
import type { HackathonTimeline } from './timeline.js';

export const SUBMISSION_SCREENSHOT_LIMIT = 3;
export const SUBMISSION_SCREENSHOT_WIDTH = 1600;
export const SUBMISSION_SCREENSHOT_RESERVATION_MINUTES = 15;

export const submissionScreenshotReserveSchema = z.strictObject({
  eventId: idSchema,
});

export const submissionScreenshotRemoveSchema = z.strictObject({
  eventId: idSchema,
  screenshotId: idSchema,
});

/** Where a screenshot's one re-encoded image is kept in the private bucket. */
export const submissionScreenshotKey = (
  submissionId: string,
  screenshotId: string,
): string => `submissions/${submissionId}/${screenshotId}.webp`;

/**
 * Decide whether a member can add or remove a screenshot (B-SUB-09): whoever can save the draft, on
 * an entry that has been saved, since a screenshot belongs to an entry, and that is not disqualified.
 */
export const decideScreenshotChange = (input: {
  readonly timeline: HackathonTimeline;
  readonly now: number;
  readonly membership: TeamMembership | null;
  readonly entry: HackathonSubmissionStatus | null;
}): Result<true> => {
  const decided = decideDraftSave(input);
  if (!decided.ok) return decided;
  if (input.entry === null)
    return err(new AppError('entry_not_saved', 'Save the entry first'));
  if (input.entry === 'disqualified')
    return err(
      new AppError('submission_locked', 'This entry can no longer change'),
    );
  return ok(true);
};
