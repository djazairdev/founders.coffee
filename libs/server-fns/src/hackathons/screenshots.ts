import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  markSubmissionScreenshotReady,
  readCaptainScreenshot,
  readParticipantStanding,
  readTeamSubmission,
  removeSubmissionScreenshot,
  reserveSubmissionScreenshot,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { inspectPhoto, type PhotoServices } from '../profile/photo.js';
import { loadTeamHackathon } from './team-context.js';

const RESERVATION_MS =
  hackathons.SUBMISSION_SCREENSHOT_RESERVATION_MINUTES * 60_000;

const notFound = () =>
  err(new AppError('not_found', 'No such screenshot on your entry'));

type Change = {
  readonly teamId: string;
  readonly submissionId: string;
};

/** Ask the rules whether the member may change the entry's screenshots now. */
const decideChange = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
  now: number,
): Promise<Result<Change>> => {
  const loaded = await loadTeamHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const { membership } = await readParticipantStanding(db, input);
  const entry = membership
    ? await readTeamSubmission(db, membership.teamId)
    : null;
  const decided = hackathons.decideScreenshotChange({
    timeline: loaded.data.timeline,
    now,
    membership,
    entry: entry?.status ?? null,
  });
  if (!decided.ok) return decided;
  return membership && entry
    ? ok({ teamId: membership.teamId, submissionId: entry.id })
    : notFound();
};

/**
 * Claim a place for a screenshot before a single byte is sent (B-SUB-09), like a profile photo. The
 * write re-checks the captain, the phase and the limit, so when it lands nothing and the rules still
 * allow the change, the entry is full.
 */
export const reserveScreenshotResolver = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
  now: number = Date.now(),
): Promise<Result<{ readonly screenshotId: string }>> => {
  const decided = await decideChange(db, input, now);
  if (!decided.ok) return decided;
  const { teamId, submissionId } = decided.data;
  const screenshotId = id('sht');
  const isReserved = await reserveSubmissionScreenshot(db, {
    id: screenshotId,
    eventId: input.eventId,
    teamId,
    captainId: input.userId,
    submissionId,
    objectKey: hackathons.submissionScreenshotKey(submissionId, screenshotId),
    limit: hackathons.SUBMISSION_SCREENSHOT_LIMIT,
    expiresAt: new Date(now + RESERVATION_MS),
  });
  if (isReserved) return ok({ screenshotId });
  const again = await decideChange(db, input, now);
  return again.ok
    ? err(
        new AppError(
          'screenshot_limit_reached',
          'An entry can have three screenshots',
        ),
      )
    : again;
};

/**
 * Accept the bytes for a reservation: check them, re-encode them, store the result, then attach it.
 * Only the re-encoded image is kept, since nothing ever needs another size and the original may
 * carry metadata, and a failure at any step leaves the entry as it was.
 */
export const acceptScreenshotUpload = async (
  db: Db,
  services: PhotoServices,
  input: {
    readonly userId: string;
    readonly screenshotId: string;
    readonly bytes: Uint8Array;
  },
  now: number = Date.now(),
): Promise<Result<{ readonly screenshotId: string }>> => {
  const reserved = await readCaptainScreenshot(db, {
    id: input.screenshotId,
    userId: input.userId,
  });
  if (!reserved) return notFound();
  if (reserved.status !== 'pending')
    return err(
      new AppError('photo_reservation_used', 'Start the upload again'),
    );
  if (reserved.expiresAt.getTime() <= now)
    return err(
      new AppError('photo_reservation_expired', 'Start the upload again'),
    );
  const decided = await decideChange(
    db,
    { eventId: reserved.eventId, userId: input.userId },
    now,
  );
  if (!decided.ok) return decided;
  const inspected = await inspectPhoto(services, input.bytes);
  if (!inspected.ok) return inspected;
  const image = await services.normalizer.scaledDown(
    input.bytes,
    hackathons.SUBMISSION_SCREENSHOT_WIDTH,
  );
  await services.store.put(reserved.objectKey, image.bytes, image.contentType);
  const scale = Math.min(
    1,
    hackathons.SUBMISSION_SCREENSHOT_WIDTH / inspected.data.width,
  );
  const isReady = await markSubmissionScreenshotReady(db, {
    id: input.screenshotId,
    width: Math.round(inspected.data.width * scale),
    height: Math.round(inspected.data.height * scale),
  });
  if (!isReady)
    return err(
      new AppError('photo_reservation_used', 'Start the upload again'),
    );
  logger.info('hackathon.submission_screenshot_stored', {
    eventId: reserved.eventId,
    screenshotId: input.screenshotId,
  });
  return ok({ screenshotId: input.screenshotId });
};

/** Take a screenshot off the entry; the daily sweep removes its bytes (B-SUB-09). */
export const removeScreenshotResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly userId: string;
    readonly screenshotId: string;
  },
  now: number = Date.now(),
): Promise<Result<{ readonly screenshotId: string }>> => {
  const decided = await decideChange(db, input, now);
  if (!decided.ok) return decided;
  const isRemoved = await removeSubmissionScreenshot(db, {
    id: input.screenshotId,
    eventId: input.eventId,
    teamId: decided.data.teamId,
    captainId: input.userId,
  });
  if (!isRemoved) return notFound();
  logger.info('hackathon.submission_screenshot_removed', {
    eventId: input.eventId,
    screenshotId: input.screenshotId,
  });
  return ok({ screenshotId: input.screenshotId });
};
