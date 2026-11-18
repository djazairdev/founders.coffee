import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  createDb,
  eq,
  hackathonSubmissionScreenshots as screenshots,
} from '@founders-coffee/db';
import { R2PhotoStore } from '@founders-coffee/infra';

import { sweepSubmissionScreenshots } from './submission-screenshot-sweep.js';

const NOW = new Date('2050-01-01T00:00:00Z');
const bucket = () =>
  (env as unknown as { SUBMISSION_ASSETS: R2Bucket }).SUBMISSION_ASSETS;

const seed = async (
  status: 'pending' | 'ready' | 'removed',
  expiresAt: Date,
) => {
  const db = createDb(env.DB);
  const screenshotId = id('sht');
  const objectKey = `submissions/sub_gone/${screenshotId}.webp`;
  await new R2PhotoStore(bucket()).put(
    objectKey,
    new Uint8Array([1]),
    'image/webp',
  );
  await db.insert(screenshots).values({
    id: screenshotId,
    submissionId: 'sub_gone',
    eventId: 'evt_gone',
    teamId: 'tea_gone',
    objectKey,
    status,
    expiresAt,
  });
  return { db, screenshotId, objectKey };
};

const rowCount = async (
  db: ReturnType<typeof createDb>,
  screenshotId: string,
) =>
  (
    await db
      .select({ id: screenshots.id })
      .from(screenshots)
      .where(eq(screenshots.id, screenshotId))
  ).length;

describe('submission screenshot sweep (real D1 and R2)', () => {
  it('removes the bytes and the row of a removed screenshot', async () => {
    const { db, screenshotId, objectKey } = await seed('removed', NOW);
    const store = new R2PhotoStore(bucket());

    await sweepSubmissionScreenshots(db, store, NOW);

    expect(await rowCount(db, screenshotId)).toBe(0);
    expect(await store.get(objectKey)).toBeNull();
  });

  it('collects a reservation out of time, and an image whose entry is gone', async () => {
    const pending = await seed('pending', new Date(NOW.getTime() - 1000));
    const orphan = await seed('ready', new Date(NOW.getTime() + 1000));
    const store = new R2PhotoStore(bucket());

    await sweepSubmissionScreenshots(pending.db, store, NOW);

    expect(await rowCount(pending.db, pending.screenshotId)).toBe(0);
    expect(await rowCount(orphan.db, orphan.screenshotId)).toBe(0);
    expect(await store.get(orphan.objectKey)).toBeNull();
  });
});
