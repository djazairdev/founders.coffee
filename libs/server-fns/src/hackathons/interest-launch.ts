import { id } from '@founders-coffee/core';
import { openHackathonInterestLaunch, type Db } from '@founders-coffee/db';
import { logger, reportError } from '@founders-coffee/observability';

/**
 * Owe the market's interest list its registration notice, once a hackathon there is approved
 * (B-ANN-05). Only the market's first hackathon writes the round; the recovery sweep sends it once
 * registration opens. A failure is reported, never thrown: the approval has already happened.
 */
export const openInterestLaunchFor = async (
  db: Db,
  event: { readonly id: string; readonly marketCode: string },
  now: Date = new Date(),
): Promise<void> => {
  try {
    const { written } = await openHackathonInterestLaunch(db, {
      id: id('hil'),
      eventId: event.id,
      marketCode: event.marketCode,
      now,
    });
    if (written)
      logger.info('hackathon_interest.launch_opened', {
        eventId: event.id,
        marketCode: event.marketCode,
      });
  } catch (error) {
    reportError(error, {
      operation: 'open_hackathon_interest_launch',
      eventId: event.id,
    });
  }
};
