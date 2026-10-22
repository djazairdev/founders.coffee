import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { id } from '@founders-coffee/core';

import { person } from './account-closure.fixtures.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import { addHackathonTrack } from './hackathon-tracks.js';
import { newTeam } from './hackathon-teams.fixtures.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import {
  events,
  hackathonSubmissions,
  hackathonSubmissionVersions,
  hackathonTeams,
  type NewHackathonSubmission,
} from './schema.js';

let db: Db;

const BRIEF = 'Build a tool that a founder in Algiers would use every week.';
const STATEMENT =
  'We wrote the code ourselves and used an assistant for tests.';

const newHackathon = async () => {
  const row = hackathonEventRow();
  await createHackathon(db, row);
  const trackId = id('trk');
  await addHackathonTrack(db, {
    id: trackId,
    eventId: row.id,
    track: {
      kind: 'founder_problem',
      title: 'Payments',
      brief: BRIEF,
      partnerName: null,
      sourceUrls: [],
    },
  });
  const teamId = await newTeam(db, row.id, 'Byte Club');
  return { eventId: row.id, trackId, teamId };
};

const draft = (
  hackathon: { eventId: string; teamId: string },
  values: Partial<NewHackathonSubmission> = {},
) =>
  db.insert(hackathonSubmissions).values({
    id: id('sub'),
    eventId: hackathon.eventId,
    teamId: hackathon.teamId,
    title: 'Ledger for corner shops',
    ...values,
  });

const complete = (trackId: string): Partial<NewHackathonSubmission> => ({
  trackId,
  description: BRIEF,
  repositoryUrl: 'https://github.com/byte-club/ledger',
  aiStatement: STATEMENT,
  originalWorkAttestedAt: new Date('2099-03-14T10:00:00Z'),
});

describe('hackathon submissions (B-SUB-01, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('keeps one submission per team, from a team of the same hackathon', async () => {
    const hackathon = await newHackathon();
    const other = await newHackathon();

    await draft(hackathon);

    await expect(draft(hackathon)).rejects.toThrow();
    await expect(
      draft({ eventId: hackathon.eventId, teamId: other.teamId }),
    ).rejects.toThrow();
  });

  it('takes only a track of its own hackathon, and none while a draft', async () => {
    const hackathon = await newHackathon();
    const other = await newHackathon();

    await expect(
      draft(hackathon, { trackId: other.trackId }),
    ).rejects.toThrow();
    await draft(hackathon, { trackId: null });
    await db
      .update(hackathonSubmissions)
      .set({ trackId: hackathon.trackId })
      .where(eq(hackathonSubmissions.teamId, hackathon.teamId));
  });

  it('lets a draft be incomplete, and a submission only complete and dated', async () => {
    const incomplete = await newHackathon();
    const undated = await newHackathon();
    const dated = await newHackathon();
    const early = await newHackathon();

    await expect(
      draft(incomplete, { status: 'submitted', submittedAt: new Date() }),
    ).rejects.toThrow();
    await expect(
      draft(undated, { ...complete(undated.trackId), status: 'submitted' }),
    ).rejects.toThrow();
    await draft(dated, {
      ...complete(dated.trackId),
      status: 'submitted',
      submittedAt: new Date(),
    });
    await expect(draft(early, { submittedAt: new Date() })).rejects.toThrow();
  });

  it('holds titles, lists and statements to their limits', async () => {
    const hackathon = await newHackathon();

    await expect(draft(hackathon, { title: '   ' })).rejects.toThrow();
    await expect(
      draft(hackathon, {
        pullRequestUrls: Array.from(
          { length: 11 },
          (_, index) => `https://github.com/byte-club/ledger/pull/${index + 1}`,
        ),
      }),
    ).rejects.toThrow();
    await expect(
      draft(hackathon, { aiStatement: 'x'.repeat(1001) }),
    ).rejects.toThrow();
    await draft(hackathon, { aiTools: ['Claude', 'Copilot'] });
    const [row] = await db
      .select()
      .from(hackathonSubmissions)
      .where(eq(hackathonSubmissions.teamId, hackathon.teamId));
    expect(row).toMatchObject({
      status: 'draft',
      version: 1,
      description: '',
      pullRequestUrls: [],
      aiTools: ['Claude', 'Copilot'],
    });
  });

  it('keeps one snapshot per submitted version, gone with the submission’s team', async () => {
    const hackathon = await newHackathon();
    const submissionId = id('sub');
    const submitter = await person(db, 'Lina');
    await draft(hackathon, { id: submissionId });
    const snapshot = (version: number) =>
      db.insert(hackathonSubmissionVersions).values({
        submissionId,
        version,
        trackId: hackathon.trackId,
        title: 'Ledger for corner shops',
        description: BRIEF,
        repositoryUrl: 'https://github.com/byte-club/ledger',
        pullRequestUrls: [],
        aiTools: [],
        aiStatement: STATEMENT,
        originalWorkAttestedAt: new Date(),
        submittedAt: new Date(),
        submittedBy: submitter.id,
      });

    await snapshot(1);
    await snapshot(2);
    await expect(snapshot(2)).rejects.toThrow();

    await db
      .delete(hackathonTeams)
      .where(eq(hackathonTeams.id, hackathon.teamId));
    expect(
      await db
        .select()
        .from(hackathonSubmissionVersions)
        .where(eq(hackathonSubmissionVersions.submissionId, submissionId)),
    ).toEqual([]);
  });

  it('goes with its hackathon', async () => {
    const hackathon = await newHackathon();
    await draft(hackathon);

    await db.delete(events).where(eq(events.id, hackathon.eventId));

    expect(
      await db
        .select()
        .from(hackathonSubmissions)
        .where(eq(hackathonSubmissions.eventId, hackathon.eventId)),
    ).toEqual([]);
  });
});
