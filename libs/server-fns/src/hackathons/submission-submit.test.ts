import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  eq,
  hackathons as hackathonRows,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  submitTeamSubmission,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import type { Metrics } from '@founders-coffee/observability';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { submitSubmissionResolver } from './submission-submit.js';
import { building } from './submission.fixtures.js';

let db: Db;

const [captain, member] = members.map((row) => row.id) as [string, string];
const DEADLINE = Date.parse('2099-01-16T12:00:00Z');

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

/** A building team whose captain saved a complete entry, at version 1. */
const saved = async (values: Record<string, unknown> = {}) => {
  const team = await building(db, [captain, member]);
  const draft = await saveSubmissionDraftResolver(db, {
    eventId: team.eventId,
    userId: captain,
    version: 0,
    draft: hackathons.submissionDraftSchema.parse({
      trackId: team.trackId,
      title: 'Ledger',
      description: 'A ledger a corner shop keeps on its phone.',
      repositoryUrl: 'https://github.com/byte-club/ledger',
      aiStatement: 'We wrote every line ourselves and used no AI tools.',
      ...values,
    }),
  });
  if (!draft.ok) throw draft.error;
  return team;
};

const submit = (
  eventId: string,
  version: number,
  now?: number,
  userId = captain,
  metrics: Metrics | null = null,
) => submitSubmissionResolver(db, metrics, { eventId, userId, version }, now);

const rowOf = async (teamId: string) =>
  (
    await db
      .select()
      .from(hackathonSubmissions)
      .where(eq(hackathonSubmissions.teamId, teamId))
  )[0];

const snapshotsOf = (submissionId: string) =>
  db
    .select()
    .from(hackathonSubmissionVersions)
    .where(eq(hackathonSubmissionVersions.submissionId, submissionId));

describe('submitting an entry (B-SUB-04, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('submits at the version the captain saw, keeps a snapshot, and counts it', async () => {
    const { eventId, teamId, trackId } = await saved();
    const trackEvent = vi.fn();
    const now = DEADLINE - 3_600_000;

    const submitted = await submit(eventId, 1, now, captain, {
      trackEvent,
    } as unknown as Metrics);

    if (!submitted.ok) throw submitted.error;
    expect(submitted.data).toMatchObject({ version: 2, submittedAt: now });
    expect(await rowOf(teamId)).toMatchObject({
      status: 'submitted',
      version: 2,
      submittedAt: new Date(now),
      originalWorkAttestedAt: new Date(now),
    });
    expect(await snapshotsOf(submitted.data.submissionId)).toMatchObject([
      {
        version: 2,
        trackId,
        title: 'Ledger',
        repositoryUrl: 'https://github.com/byte-club/ledger',
        submittedAt: new Date(now),
        submittedBy: captain,
      },
    ]);
    expect(trackEvent).toHaveBeenCalledWith('submission_submitted', {
      market: 'DZ',
      hackathon: eventId,
      track: trackId,
    });
  });

  it('submits in the last second before the deadline, and refuses at the deadline itself', async () => {
    const { eventId, teamId } = await saved();
    await db
      .update(hackathonRows)
      .set({ submissionDeadlineAt: new Date(DEADLINE) })
      .where(eq(hackathonRows.eventId, eventId));

    expect(codeOf(await submit(eventId, 1, DEADLINE))).toBe('deadline_passed');
    expect(codeOf(await submit(eventId, 1, DEADLINE + 1))).toBe(
      'deadline_passed',
    );
    expect((await rowOf(teamId))?.status).toBe('draft');

    expect(codeOf(await submit(eventId, 1, DEADLINE - 1))).toBeNull();
    expect((await rowOf(teamId))?.status).toBe('submitted');
  });

  it('holds the deadline in the write itself, whatever was decided before it', async () => {
    const { eventId, teamId } = await saved();
    const write = (now: number) =>
      submitTeamSubmission(db, {
        eventId,
        teamId,
        captainId: captain,
        version: 1,
        now: new Date(now),
      });

    expect(await write(DEADLINE)).toBeNull();
    expect(await write(DEADLINE - 1)).toBe(2);
    const [row] = await db
      .select()
      .from(hackathonSubmissionVersions)
      .where(eq(hackathonSubmissionVersions.version, 2));
    expect(row?.submittedBy).toBe(captain);
  });

  it('lets a team submit again before the deadline, keeping each snapshot', async () => {
    const { eventId, teamId, trackId } = await saved();
    const first = await submit(eventId, 1);
    if (!first.ok) throw first.error;
    const resaved = await saveSubmissionDraftResolver(db, {
      eventId,
      userId: captain,
      version: 2,
      draft: hackathons.submissionDraftSchema.parse({
        trackId,
        title: 'Ledger, now with receipts',
        description: 'A ledger a corner shop keeps on its phone.',
        repositoryUrl: 'https://github.com/byte-club/ledger',
        aiStatement: 'We wrote every line ourselves and used no AI tools.',
      }),
    });
    if (!resaved.ok) throw resaved.error;
    expect((await rowOf(teamId))?.status).toBe('submitted');

    const second = await submit(eventId, 3);

    expect(second).toMatchObject({ ok: true, data: { version: 4 } });
    expect(
      (await snapshotsOf(first.data.submissionId))
        .map((snapshot) => [snapshot.version, snapshot.title])
        .sort(),
    ).toEqual([
      [2, 'Ledger'],
      [4, 'Ledger, now with receipts'],
    ]);
  });

  it('refuses a stale version, a member who is not captain, and an incomplete entry', async () => {
    const { eventId } = await saved();

    expect(codeOf(await submit(eventId, 7))).toBe('submission_conflict');
    expect(codeOf(await submit(eventId, 1, undefined, member))).toBe(
      'not_team_captain',
    );

    const short = await saved({ description: 'Too short.' });
    expect(codeOf(await submit(short.eventId, 1))).toBe(
      'submission_incomplete',
    );
  });

  it('refuses an AI-native hackathon’s entry that names no AI tools', async () => {
    const { eventId } = await saved();
    await db
      .update(hackathonRows)
      .set({ aiPolicy: 'ai_native' })
      .where(eq(hackathonRows.eventId, eventId));

    expect(codeOf(await submit(eventId, 1))).toBe('ai_tools_required');
  });
});
