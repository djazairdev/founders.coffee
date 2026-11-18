import {
  ok,
  type HackathonResultsNoticesDueMessage,
  type Result,
} from '@founders-coffee/core';
import type { Db } from '@founders-coffee/db';
import { logger } from '@founders-coffee/observability';
import { enqueueResultsNoticeBatch } from '@founders-coffee/server-fns/hackathon-results-notices';

const BATCH_SIZE = 50;

export interface HackathonResultsNoticesDeps {
  readonly requeue?: (
    message: HackathonResultsNoticesDueMessage,
    delaySeconds: number,
  ) => Promise<void>;
}

/**
 * Write one batch of a hackathon's results notices (B-JDG-11), then hand the rest back to the queue.
 * The notices themselves go out through the event's scheduler, like any other.
 */
export const processHackathonResultsNotices = async (
  db: Db,
  message: HackathonResultsNoticesDueMessage,
  deps: HackathonResultsNoticesDeps,
): Promise<Result<{ readonly written: number }>> => {
  const { written, next } = await enqueueResultsNoticeBatch(db, {
    eventId: message.eventId,
    afterUserId: message.afterUserId,
    limit: BATCH_SIZE,
  });
  logger.info('hackathon_results.notices_written', {
    eventId: message.eventId,
    written,
  });
  if (next) await deps.requeue?.({ ...message, afterUserId: next }, 0);
  return ok({ written });
};
