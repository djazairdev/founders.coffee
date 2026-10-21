import { deleteExpiredHackathonInterest, type Db } from '@founders-coffee/db';
import { logger } from '@founders-coffee/observability';

import { deleteInPasses } from './retention.js';

/**
 * The hackathon interest list's part of the daily retention sweep (B-ANN-01): the addresses whose
 * registration notice went out more than twelve months ago, as the privacy policy keeps them.
 */
export const sweepExpiredHackathonInterest = async (
  db: Db,
): Promise<number> => {
  const now = new Date();
  const deleted = await deleteInPasses((limit) =>
    deleteExpiredHackathonInterest(db, { now, limit }),
  );
  if (deleted > 0)
    logger.info('hackathon_interest.retention_sweep', { deleted });
  return deleted;
};
