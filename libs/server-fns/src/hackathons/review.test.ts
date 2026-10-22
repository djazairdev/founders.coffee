import { beforeEach, describe, expect, it } from 'vitest';

import { eq, hackathons, type Db } from '@founders-coffee/db';

import { hackathonDraftResolver } from './draft-view.js';
import {
  codeOf,
  detailsFor,
  draftHackathon,
  hackathonWithDetails,
  ORGANISATION,
  publishHackathon,
  setupHackathonDb,
} from './edit.fixtures.js';
import { saveHackathonDetailsResolver } from './details.js';
import { readyHackathon } from './review.fixtures.js';
import { submitHackathonForReviewResolver } from './review.js';

let db: Db;

const submit = (eventId: string, version: number) =>
  submitHackathonForReviewResolver(db, {
    eventId,
    version,
    organisationId: ORGANISATION,
  });

const reviewOf = async (eventId: string) =>
  (
    await db
      .select({
        status: hackathons.reviewStatus,
        note: hackathons.reviewNote,
      })
      .from(hackathons)
      .where(eq(hackathons.eventId, eventId))
  )[0];

describe('sending a hackathon for review (B-HKN-08, real D1)', () => {
  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  it('sends a complete draft, moves its version on, and stops edits', async () => {
    const { eventId, version } = await readyHackathon(db);

    const result = await submit(eventId, version);

    expect(result).toEqual({
      ok: true,
      data: { eventId, version: version + 1 },
    });
    expect(await reviewOf(eventId)).toEqual({
      status: 'submitted',
      note: null,
    });
    const draft = await hackathonDraftResolver(db, eventId);
    expect(draft.ok && draft.data.isEditable).toBe(false);
    expect(draft.ok && draft.data.review).toEqual({
      status: 'submitted',
      note: null,
      gaps: [],
    });
    expect(codeOf(await submit(eventId, version + 1))).toBe(
      'hackathon_not_editable',
    );
  });

  it('names what an incomplete hackathon lacks, and writes nothing', async () => {
    const { eventId, version } = await hackathonWithDetails(db);

    const result = await submit(eventId, version);

    expect(result.ok ? null : result.error).toMatchObject({
      code: 'hackathon_incomplete',
      details: { gaps: ['tracks', 'rubric'] },
    });
    expect((await reviewOf(eventId))?.status).toBe('draft');
  });

  it('lists every gap of a hackathon with no details yet', async () => {
    const { eventId } = await draftHackathon(db);

    const draft = await hackathonDraftResolver(db, eventId);

    expect(draft.ok && draft.data.review.gaps).toEqual([
      'details',
      'tracks',
      'rubric',
    ]);
    const result = await submit(eventId, 1);
    expect(result.ok ? null : result.error).toMatchObject({
      code: 'hackathon_incomplete',
      details: { gaps: ['details', 'tracks', 'rubric'] },
    });
  });

  it('refuses a stale page, and a published hackathon', async () => {
    const { eventId, version } = await readyHackathon(db);

    expect(codeOf(await submit(eventId, version - 1))).toBe(
      'hackathon_conflict',
    );
    await publishHackathon(db, eventId);
    expect(codeOf(await submit(eventId, version))).toBe(
      'hackathon_not_submittable',
    );
  });

  it('sends one the reviewers sent back again, clearing their note', async () => {
    const { eventId, version } = await readyHackathon(db);
    await db
      .update(hackathons)
      .set({ reviewStatus: 'rejected', reviewNote: 'Add a judging plan.' })
      .where(eq(hackathons.eventId, eventId));
    const draft = await hackathonDraftResolver(db, eventId);
    expect(draft.ok && draft.data.isEditable).toBe(true);
    expect(draft.ok && draft.data.review.note).toBe('Add a judging plan.');

    expect((await submit(eventId, version)).ok).toBe(true);
    expect(await reviewOf(eventId)).toEqual({
      status: 'submitted',
      note: null,
    });
  });

  it('keeps a hackathon with the reviewers from changing', async () => {
    const { eventId, version } = await readyHackathon(db);
    const submitted = await submit(eventId, version);
    const next = submitted.ok ? submitted.data.version : 0;

    const saved = await saveHackathonDetailsResolver(db, {
      eventId,
      version: next,
      organisationId: ORGANISATION,
      details: detailsFor(Date.now() + 30 * 86_400_000),
    });

    expect(codeOf(saved)).toBe('hackathon_not_editable');
  });
});
