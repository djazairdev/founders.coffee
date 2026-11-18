import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  eq,
  hackathons as hackathonRows,
  hackathonSubmissionScreenshots,
  listSubmissionScreenshots,
  readViewableScreenshot,
  recuseFromEntry,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import {
  CloudflareImagesNormalizer,
  R2PhotoStore,
} from '@founders-coffee/infra';

import {
  landscapePng,
  notAnImage,
  tinyPng,
} from '../profile/photo.fixtures.js';
import type { PhotoServices } from '../profile/photo.js';
import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { judgeOf, submitted, toJudging, unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import {
  acceptScreenshotUpload,
  removeScreenshotResolver,
  reserveScreenshotResolver,
} from './screenshots.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { building } from './submission.fixtures.js';

let db: Db;

const [captain, member, outsider] = members.map((row) => row.id) as [
  string,
  string,
  string,
];

const services = (): PhotoServices => {
  const bindings = env as unknown as {
    SUBMISSION_ASSETS: R2Bucket;
    IMAGES: ImagesBinding;
  };
  return {
    store: new R2PhotoStore(bindings.SUBMISSION_ASSETS),
    normalizer: new CloudflareImagesNormalizer(bindings.IMAGES),
  };
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const withEntry = async () => {
  const world = await building(db, [captain, member]);
  const saved = await saveSubmissionDraftResolver(db, {
    eventId: world.eventId,
    userId: captain,
    version: 0,
    draft: hackathons.submissionDraftSchema.parse({ title: 'Ledger' }),
  });
  return { ...world, submissionId: unwrap(saved).submissionId };
};

const add = async (eventId: string, bytes = landscapePng()) => {
  const { screenshotId } = unwrap(
    await reserveScreenshotResolver(db, { eventId, userId: captain }),
  );
  return {
    screenshotId,
    result: await acceptScreenshotUpload(db, services(), {
      userId: captain,
      screenshotId,
      bytes,
    }),
  };
};

describe('screenshots on a submission (B-SUB-09, real D1, R2 and Images)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('stores one re-encoded image the team can see, and the shape it came in', async () => {
    const { eventId, submissionId } = await withEntry();
    const { screenshotId, result } = await add(eventId);
    expect(result.ok).toBe(true);

    expect(await listSubmissionScreenshots(db, submissionId)).toEqual([
      { id: screenshotId, width: 320, height: 240 },
    ]);
    const viewable = await readViewableScreenshot(db, {
      id: screenshotId,
      userId: member,
    });
    const stored = await services().store.get(viewable?.objectKey ?? '');
    expect(stored).not.toBeNull();
    await stored?.body.cancel();
  });

  it('refuses a fourth screenshot, counting a reservation still in time', async () => {
    const { eventId } = await withEntry();
    await add(eventId);
    await add(eventId);
    unwrap(await reserveScreenshotResolver(db, { eventId, userId: captain }));

    expect(
      codeOf(await reserveScreenshotResolver(db, { eventId, userId: captain })),
    ).toBe('screenshot_limit_reached');
  });

  it('asks for the entry to be saved first, and refuses anyone but the captain', async () => {
    const { eventId } = await building(db, [captain, member]);
    expect(
      codeOf(await reserveScreenshotResolver(db, { eventId, userId: captain })),
    ).toBe('entry_not_saved');
    expect(
      codeOf(await reserveScreenshotResolver(db, { eventId, userId: member })),
    ).toBe('not_team_captain');
    expect(
      codeOf(
        await reserveScreenshotResolver(db, { eventId, userId: outsider }),
      ),
    ).toBe('not_team_captain');
  });

  it("keeps a member from sending bytes to the captain's reservation", async () => {
    const { eventId } = await withEntry();
    const { screenshotId } = unwrap(
      await reserveScreenshotResolver(db, { eventId, userId: captain }),
    );

    expect(
      codeOf(
        await acceptScreenshotUpload(db, services(), {
          userId: member,
          screenshotId,
          bytes: landscapePng(),
        }),
      ),
    ).toBe('not_found');
  });

  it('refuses what is not an image, and an image too small, leaving the entry as it was', async () => {
    const { eventId, submissionId } = await withEntry();

    expect(codeOf((await add(eventId, notAnImage())).result)).toBe(
      'photo_unsupported',
    );
    expect(codeOf((await add(eventId, tinyPng())).result)).toBe(
      'photo_too_small',
    );
    expect(await listSubmissionScreenshots(db, submissionId)).toEqual([]);
  });

  it('refuses a reservation used twice or out of time', async () => {
    const { eventId } = await withEntry();
    const { screenshotId } = await add(eventId);
    expect(
      codeOf(
        await acceptScreenshotUpload(db, services(), {
          userId: captain,
          screenshotId,
          bytes: landscapePng(),
        }),
      ),
    ).toBe('photo_reservation_used');

    const late = unwrap(
      await reserveScreenshotResolver(db, { eventId, userId: captain }),
    );
    await db
      .update(hackathonSubmissionScreenshots)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(hackathonSubmissionScreenshots.id, late.screenshotId));
    expect(
      codeOf(
        await acceptScreenshotUpload(db, services(), {
          userId: captain,
          screenshotId: late.screenshotId,
          bytes: landscapePng(),
        }),
      ),
    ).toBe('photo_reservation_expired');
  });

  it('takes a screenshot off the entry, which frees its place and stops serving it', async () => {
    const { eventId, submissionId } = await withEntry();
    const { screenshotId } = await add(eventId);

    expect(
      codeOf(
        await removeScreenshotResolver(db, {
          eventId,
          userId: member,
          screenshotId,
        }),
      ),
    ).toBe('not_team_captain');
    unwrap(
      await removeScreenshotResolver(db, {
        eventId,
        userId: captain,
        screenshotId,
      }),
    );

    expect(await listSubmissionScreenshots(db, submissionId)).toEqual([]);
    expect(
      await readViewableScreenshot(db, { id: screenshotId, userId: captain }),
    ).toBeNull();
  });

  it('shows an image to the team and, once judging starts, to a judge who has not recused', async () => {
    const { eventId, submissionId } = await submitted(db);
    const { screenshotId } = await add(eventId);
    const judge = await judgeOf(db, eventId);
    const canSee = async (userId: string) =>
      (await readViewableScreenshot(db, { id: screenshotId, userId })) !== null;

    expect(await canSee(member)).toBe(true);
    expect(await canSee(judge.userId)).toBe(false);
    expect(await canSee(outsider)).toBe(false);

    await toJudging(db, eventId);
    expect(await canSee(judge.userId)).toBe(true);
    expect(await canSee(outsider)).toBe(false);

    await recuseFromEntry(db, {
      judgeId: judge.judgeId,
      submissionId,
      eventId,
      reason: 'I advised this team.',
      actorUserId: judge.userId,
      auditId: id('audit'),
    });
    expect(await canSee(judge.userId)).toBe(false);
  });

  it('refuses a change once the deadline has passed', async () => {
    const { eventId } = await withEntry();
    await db
      .update(hackathonRows)
      .set({ submissionDeadlineAt: new Date(Date.now() - 1000) })
      .where(eq(hackathonRows.eventId, eventId));

    expect(
      codeOf(await reserveScreenshotResolver(db, { eventId, userId: captain })),
    ).toBe('deadline_passed');
  });
});
