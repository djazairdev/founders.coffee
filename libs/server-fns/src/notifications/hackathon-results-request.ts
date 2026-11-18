import { logger, reportError } from '@founders-coffee/observability';

import { workerEnv } from '../env.js';

/**
 * Hand telling a hackathon's participants that its results are out to the queue (B-JDG-11): the list
 * can run to thousands, more than one request can write. A failure is reported, never thrown: the
 * results are already published.
 */
export const requestResultsNotices = async (eventId: string): Promise<void> => {
  const queue = workerEnv().NOTIFICATIONS;
  if (!queue) {
    logger.warn('hackathon_results.notices_queue_unbound', { eventId });
    return;
  }
  try {
    await queue.send({
      kind: 'hackathon_results_notices_due',
      eventId,
      afterUserId: null,
    });
  } catch (error) {
    reportError(error, { operation: 'request_results_notices', eventId });
  }
};
