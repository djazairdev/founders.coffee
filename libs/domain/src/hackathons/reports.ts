import { z } from 'zod';

import {
  AppError,
  err,
  hackathonReportReasonSchema,
  hackathonReportTargetSchema,
  idSchema,
  ok,
  type Result,
} from '@founders-coffee/core';

export const hackathonReportSchema = z.strictObject({
  eventId: idSchema,
  targetType: hackathonReportTargetSchema,
  targetId: idSchema,
  reason: hackathonReportReasonSchema,
});

export type HackathonReportInput = z.infer<typeof hackathonReportSchema>;

/**
 * Decide whether a member may report an entry or a team of a hackathon (B-SAFE-01): one the
 * hackathon shows, a submitted entry or a team of a published hackathon
 * (`report_target_not_found`), never their own team or its entry (`own_team_report`), and once
 * (`already_reported`).
 */
export const decideHackathonReport = (
  target: {
    readonly isReporterInTeam: boolean;
    readonly hasReported: boolean;
  } | null,
): Result<true> => {
  if (target === null)
    return err(
      new AppError('report_target_not_found', 'Nothing to report there'),
    );
  if (target.isReporterInTeam)
    return err(
      new AppError('own_team_report', 'A member cannot report their own team'),
    );
  if (target.hasReported)
    return err(
      new AppError('already_reported', 'The member reported it already'),
    );
  return ok(true);
};
