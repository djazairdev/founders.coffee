import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import { hackathonRegistrations, type Db } from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { submissionPageResolver } from './submission-page.js';
import { building } from './submission.fixtures.js';

let db: Db;

const [captain, member, outsider] = members.map((row) => row.id) as [
  string,
  string,
  string,
];

const page = async (eventId: string, userId: string, now?: number) => {
  const read = await submissionPageResolver(db, { eventId, userId }, now);
  if (!read.ok) throw read.error;
  return read.data;
};

describe('submissionPageResolver (B-SUB-05, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('gives the captain the tracks and no entry before the first save', async () => {
    const { eventId, teamId, trackId } = await building(db, [captain, member]);

    expect(await page(eventId, captain)).toMatchObject({
      event: { id: eventId },
      stage: 'building',
      aiPolicy: 'disclosed',
      registration: 'registered',
      team: { id: teamId, name: 'Byte Club', isCaptain: true },
      tracks: [{ id: trackId, title: 'Payments', kind: 'founder_problem' }],
      entry: null,
    });
  });

  it('gives every member of the team its entry as saved', async () => {
    const { eventId, trackId } = await building(db, [captain, member]);
    const saved = await saveSubmissionDraftResolver(db, {
      eventId,
      userId: captain,
      version: 0,
      draft: hackathons.submissionDraftSchema.parse({
        trackId,
        title: 'Ledger',
        repositoryUrl: 'https://github.com/byte-club/ledger',
      }),
    });
    if (!saved.ok) throw saved.error;

    expect(await page(eventId, member)).toMatchObject({
      team: { isCaptain: false },
      entry: {
        id: saved.data.submissionId,
        status: 'draft',
        version: 1,
        trackId,
        title: 'Ledger',
        repositoryUrl: 'https://github.com/byte-club/ledger',
        pullRequestUrls: [],
        submittedAt: null,
      },
    });
  });

  it('gives someone in no team neither tracks nor an entry', async () => {
    const { eventId } = await building(db, [captain, member]);
    await db.insert(hackathonRegistrations).values({
      id: id('hrg'),
      eventId,
      userId: outsider,
      attendanceMode: 'in_person',
      codeOfConductAcceptedAt: new Date(),
    });

    expect(await page(eventId, outsider)).toMatchObject({
      registration: 'registered',
      team: null,
      tracks: [],
      entry: null,
    });
  });

  it('says whether building has started or submissions have closed', async () => {
    const { eventId } = await building(db, [captain, member]);
    const view = await page(eventId, captain);

    expect((await page(eventId, captain, view.kickoffAt - 1)).stage).toBe(
      'not_started',
    );
    expect(
      (await page(eventId, captain, view.submissionDeadlineAt)).stage,
    ).toBe('closed');
  });
});
