import { beforeEach, describe, expect, it } from 'vitest';

import { eq, hackathonSubmissions, type Db } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { building } from './submission.fixtures.js';

let db: Db;

const [captain, member] = members.map((row) => row.id) as [string, string];
const HOUR = 3_600_000;

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const draft = (values: Record<string, unknown> = {}) =>
  hackathons.submissionDraftSchema.parse({ title: 'Ledger', ...values });

const save = (
  eventId: string,
  version: number,
  values: Record<string, unknown> = {},
  userId = captain,
  now?: number,
) =>
  saveSubmissionDraftResolver(
    db,
    { eventId, userId, version, draft: draft(values) },
    now,
  );

const rowOf = async (teamId: string) =>
  (
    await db
      .select()
      .from(hackathonSubmissions)
      .where(eq(hackathonSubmissions.teamId, teamId))
  )[0];

describe('saving a submission draft (B-SUB-03, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('saves the first draft at version 1, then each save at the version the captain saw', async () => {
    const { eventId, teamId, trackId } = await building(db, [captain, member]);

    const first = await save(eventId, 0);
    if (!first.ok) throw first.error;
    expect(first.data.version).toBe(1);

    const second = await save(eventId, 1, {
      trackId,
      repositoryUrl: 'https://github.com/byte-club/ledger',
      pullRequestUrls: ['https://github.com/djazairdev/founders.coffee/pull/1'],
    });
    expect(second).toEqual({
      ok: true,
      data: { submissionId: first.data.submissionId, version: 2 },
    });
    expect(await rowOf(teamId)).toMatchObject({
      status: 'draft',
      trackId,
      repositoryUrl: 'https://github.com/byte-club/ledger',
      pullRequestUrls: ['https://github.com/djazairdev/founders.coffee/pull/1'],
      version: 2,
    });
  });

  it('refuses a stale version, a second first save, and a track of no such hackathon', async () => {
    const { eventId } = await building(db, [captain, member]);
    await save(eventId, 0);

    expect(codeOf(await save(eventId, 0))).toBe('submission_conflict');
    expect(codeOf(await save(eventId, 3))).toBe('submission_conflict');
    expect(
      codeOf(await save(eventId, 1, { trackId: `trk_${'0'.repeat(32)}` })),
    ).toBe('track_not_in_hackathon');
  });

  it('lets only the captain save, and only while the team is building', async () => {
    const { eventId } = await building(db, [captain, member]);

    expect(codeOf(await save(eventId, 0, {}, member))).toBe('not_team_captain');
    expect(
      codeOf(await save(eventId, 0, {}, captain, Date.now() - 2 * HOUR)),
    ).toBe('building_not_started');
    expect(
      codeOf(
        await save(eventId, 0, {}, captain, Date.parse('2099-01-16T12:00:00Z')),
      ),
    ).toBe('deadline_passed');
  });

  it('keeps a submitted entry complete, and a disqualified one as it was', async () => {
    const { eventId, teamId, trackId } = await building(db, [captain, member]);
    await save(eventId, 0);
    const complete = {
      trackId,
      repositoryUrl: 'https://github.com/byte-club/ledger',
      aiStatement: 'We wrote the code ourselves and used an assistant.',
    };
    await save(eventId, 1, complete);
    await db
      .update(hackathonSubmissions)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        originalWorkAttestedAt: new Date(),
      })
      .where(eq(hackathonSubmissions.teamId, teamId));

    expect(codeOf(await save(eventId, 2))).toBe('submission_incomplete');
    const edited = await save(eventId, 2, { ...complete, title: 'Ledger 2' });
    expect(edited.ok).toBe(true);
    expect(await rowOf(teamId)).toMatchObject({
      status: 'submitted',
      title: 'Ledger 2',
      version: 3,
    });

    await db
      .update(hackathonSubmissions)
      .set({ status: 'disqualified' })
      .where(eq(hackathonSubmissions.teamId, teamId));
    expect(codeOf(await save(eventId, 3, complete))).toBe('submission_locked');
  });
});
