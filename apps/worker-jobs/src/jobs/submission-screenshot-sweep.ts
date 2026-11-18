import {
  deleteScreenshotRows,
  listCollectableScreenshots,
  type Db,
} from '@founders-coffee/db';
import type { PhotoStore } from '@founders-coffee/infra';
import { logger } from '@founders-coffee/observability';

/**
 * Collect the screenshots nothing points at any more (B-SUB-09), the way the profile sweep collects
 * photos: bytes before the row, since a row without bytes is only a wasted delete next pass, and an
 * object without a row is a byte nobody can name.
 */
export const sweepSubmissionScreenshots = async (
  db: Db,
  store: PhotoStore,
  now: Date = new Date(),
  limit = 50,
): Promise<{ readonly collected: number; readonly failed: number }> => {
  const due = await listCollectableScreenshots(db, now, limit);
  const collected: string[] = [];
  let failed = 0;
  for (const screenshot of due) {
    try {
      await store.deletePrefix(screenshot.objectKey);
      collected.push(screenshot.id);
    } catch {
      failed += 1;
      logger.warn('submission_screenshot_sweep_failed', {
        screenshotId: screenshot.id,
      });
    }
  }
  await deleteScreenshotRows(db, collected);
  if (collected.length > 0 || failed > 0)
    logger.info('submission_screenshot_sweep', {
      collected: collected.length,
      failed,
    });
  return { collected: collected.length, failed };
};
