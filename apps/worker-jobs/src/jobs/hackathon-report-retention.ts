import { deleteExpiredHackathonReports, type Db } from '@founders-coffee/db';
import { logger } from '@founders-coffee/observability';

import { deleteInPasses } from './retention.js';

/**
 * The hackathon reports' part of the daily retention sweep (B-SAFE-01): the reports decided more
 * than 24 months ago, as the privacy policy keeps a moderation report.
 */
export const sweepExpiredHackathonReports = async (db: Db): Promise<number> => {
  const now = new Date();
  const deleted = await deleteInPasses((limit) =>
    deleteExpiredHackathonReports(db, { now, limit }),
  );
  if (deleted > 0) logger.info('hackathon_report.retention_sweep', { deleted });
  return deleted;
};
