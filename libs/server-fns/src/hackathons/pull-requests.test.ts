import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  addHackathonTrack,
  eq,
  hackathons as hackathonRows,
  hackathonSubmissions,
  setPullRequestStatus,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import {
  listPullRequestsResolver,
  setPullRequestStatusResolver,
} from './pull-requests.js';
import { setHackathons } from './registration.fixtures.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { submitSubmissionResolver } from './submission-submit.js';
import { building } from './submission.fixtures.js';

let db: Db;

const [captain, member] = members.map((row) => row.id) as [string, string];
const PR = 'https://github.com/djazairdev/founders.coffee/pull';
const [first, second] = [`${PR}/1`, `${PR}/2`];

const unwrap = <T>(
  result: { ok: true; data: T } | { ok: false; error: Error },
) => {
  if (!result.ok) throw result.error;
  return result.data;
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const save = (eventId: string, version: number, values: object) =>
  saveSubmissionDraftResolver(db, {
    eventId,
    userId: captain,
    version,
    draft: hackathons.submissionDraftSchema.parse({
      title: 'Patches',
      description: 'Two fixes to the meetup page’s Arabic layout.',
      repositoryUrl: 'https://github.com/djazairdev/founders.coffee',
      aiStatement: 'We wrote every line ourselves and used no AI tools.',
      ...values,
    }),
  });

/** A building team whose captain submitted two pull requests on the open-source track. */
const submitted = async () => {
  const { eventId } = await building(db, [captain, member]);
  const trackId = id('trk');
  await addHackathonTrack(db, {
    id: trackId,
    eventId,
    track: {
      kind: 'open_source',
      title: 'Open source',
      brief: 'Fix an issue of the founders.coffee repository and send it in.',
      partnerName: null,
      sourceUrls: ['https://github.com/djazairdev/founders.coffee'],
    },
  });
  const draft = unwrap(
    await save(eventId, 0, { trackId, pullRequestUrls: [first, second] }),
  );
  const sent = unwrap(
    await submitSubmissionResolver(db, null, {
      eventId,
      userId: captain,
      version: draft.version,
    }),
  );
  const [row] = await db
    .select({ id: hackathonSubmissions.id })
    .from(hackathonSubmissions)
    .where(eq(hackathonSubmissions.eventId, eventId));
  return {
    eventId,
    trackId,
    submissionId: row?.id ?? '',
    version: sent.version,
  };
};

const record = (
  input: { eventId: string; submissionId: string },
  url: string,
  status: 'submitted' | 'reviewed' | 'merged',
) => setPullRequestStatusResolver(db, { ...input, url, status });

describe('open-source pull requests (B-SUB-08, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('records what maintainers did with each pull request, and counts the three apart', async () => {
    const entry = await submitted();
    expect(unwrap(await record(entry, first, 'reviewed'))).toEqual({
      status: 'reviewed',
    });
    unwrap(await record(entry, first, 'merged'));
    unwrap(await record(entry, second, 'reviewed'));

    expect(unwrap(await listPullRequestsResolver(db, entry.eventId))).toEqual([
      {
        submissionId: entry.submissionId,
        teamName: 'Byte Club',
        title: 'Patches',
        pullRequests: [
          { url: first, status: 'merged' },
          { url: second, status: 'reviewed' },
        ],
        counts: { submitted: 2, reviewed: 2, merged: 1 },
      },
    ]);
  });

  it('reads the pull requests of the version last submitted, not a later draft', async () => {
    const entry = await submitted();
    unwrap(
      await save(entry.eventId, entry.version, {
        trackId: entry.trackId,
        pullRequestUrls: [first, `${PR}/3`],
      }),
    );

    expect(codeOf(await record(entry, `${PR}/3`, 'merged'))).toBe(
      'pull_request_not_found',
    );
    expect((await record(entry, second, 'merged')).ok).toBe(true);
    const [listed] = unwrap(await listPullRequestsResolver(db, entry.eventId));
    expect(listed?.pullRequests.map((pullRequest) => pullRequest.url)).toEqual([
      first,
      second,
    ]);
  });

  it('refuses once the results are out, and for a disqualified entry', async () => {
    const entry = await submitted();
    await db
      .update(hackathonRows)
      .set({ resultsPublishedAt: new Date() })
      .where(eq(hackathonRows.eventId, entry.eventId));
    expect(codeOf(await record(entry, first, 'merged'))).toBe(
      'results_published',
    );

    await db
      .update(hackathonRows)
      .set({ resultsPublishedAt: null })
      .where(eq(hackathonRows.eventId, entry.eventId));
    await db
      .update(hackathonSubmissions)
      .set({ status: 'disqualified' })
      .where(eq(hackathonSubmissions.id, entry.submissionId));
    expect(codeOf(await record(entry, first, 'merged'))).toBe(
      'submission_locked',
    );
  });

  it('refuses an entry that was never submitted, and lists none', async () => {
    const { eventId, trackId } = await building(db, [captain, member]);
    unwrap(await save(eventId, 0, { trackId, pullRequestUrls: [first] }));
    const [row] = await db
      .select({ id: hackathonSubmissions.id })
      .from(hackathonSubmissions)
      .where(eq(hackathonSubmissions.eventId, eventId));

    expect(
      codeOf(
        await record({ eventId, submissionId: row?.id ?? '' }, first, 'merged'),
      ),
    ).toBe('submission_not_found');
    expect(unwrap(await listPullRequestsResolver(db, eventId))).toEqual([]);
  });

  it('writes nothing for a link outside the last submitted version, even past the rule', async () => {
    const entry = await submitted();

    expect(
      await setPullRequestStatus(db, {
        eventId: entry.eventId,
        submissionId: entry.submissionId,
        url: `${PR}/9`,
        status: 'merged',
      }),
    ).toBe(false);
    expect(
      await setPullRequestStatus(db, {
        eventId: 'evt_00000000000000000000000000000000',
        submissionId: entry.submissionId,
        url: first,
        status: 'merged',
      }),
    ).toBe(false);
  });
});
