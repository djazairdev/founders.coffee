import {
  clearExpiredHackathonSkills,
  deleteExpiredHackathonTeamInvites,
  deleteExpiredHackathonTeamRequests,
  type Db,
} from '@founders-coffee/db';
import { logger } from '@founders-coffee/observability';

import { deleteInPasses } from './retention.js';

/**
 * The hackathon teams' part of the daily retention sweep (B-SAFE-05): invite links and join requests
 * thirty days after the hackathon, and the skills line twelve months after it.
 */
export const sweepHackathonTeamRetention = async (
  db: Db,
  now: Date = new Date(),
) => {
  const invites = await deleteInPasses((limit) =>
    deleteExpiredHackathonTeamInvites(db, { now, limit }),
  );
  const requests = await deleteInPasses((limit) =>
    deleteExpiredHackathonTeamRequests(db, { now, limit }),
  );
  const skills = await deleteInPasses((limit) =>
    clearExpiredHackathonSkills(db, { now, limit }),
  );
  if (invites + requests + skills > 0)
    logger.info('hackathon_team.retention_sweep', {
      invites,
      requests,
      skills,
    });
  return { invites, requests, skills };
};
