import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  readReportTarget,
  reportHackathonTarget,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { loadPlaceHackathon } from './place-context.js';

/**
 * File a member's report about an entry or a team of a hackathon (B-SAFE-01), for an administrator
 * to review. The rule decides first; the batch decides again as it writes, and when it lands
 * nothing the rule is asked again so the refusal says why. The reporter is kept for the review and
 * never shown to the team.
 */
export const reportHackathonTargetResolver = async (
  db: Db,
  input: hackathons.HackathonReportInput & { readonly reporterId: string },
): Promise<Result<{ readonly reported: true }>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async () =>
    hackathons.decideHackathonReport(await readReportTarget(db, input));
  const decided = await decide();
  if (!decided.ok) return decided;
  const outcome = await reportHackathonTarget(db, { ...input, id: id('rpt') });
  if (outcome !== 'reported') {
    const again = await decide();
    return again.ok
      ? err(new AppError('report_target_not_found', 'Nothing to report there'))
      : again;
  }
  logger.info('hackathon.reported', {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
    targetType: input.targetType,
    reason: input.reason,
  });
  return ok({ reported: true });
};
