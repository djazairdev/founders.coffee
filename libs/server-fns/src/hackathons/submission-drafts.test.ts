import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  addHackathonTrack,
  eq,
  events,
  hackathons as hackathonRows,
  hackathonSubmissions,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { openHackathon, setHackathons } from './registration.fixtures.js';
import { registerForHackathonResolver } from './registration.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { createHackathonTeamResolver } from './team-creation.js';
import {
  createTeamInviteResolver,
  joinTeamByInviteResolver,
} from './team-invites.js';

let db: Db;

const [captain, member] = members.map((row) => row.id) as [string, string];
const HOUR = 3_600_000;

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const draft = (values: Record<string, unknown> = {}) =>
  hackathons.submissionDraftSchema.parse({ title: 'Ledger', ...values });

/**
 * A hackathon whose captain's team has two members, moved on to building: registration closed two
 * hours ago and kickoff an hour ago.
 */
const building = async () => {
  const eventId = await openHackathon(db);
  for (const userId of [captain, member]) {
    const registered = await registerForHackathonResolver(db, null, {
      eventId,
      userId,
      attendanceMode: 'in_person',
      isAgeAttested: false,
      isLookingForTeam: true,
      skills: null,
    });
    if (!registered.ok) throw registered.error;
  }
  const team = await createHackathonTeamResolver(db, null, {
    eventId,
    userId: captain,
    name: 'Byte Club',
    description: null,
    isLookingForMembers: true,
  });
  if (!team.ok) throw team.error;
  const link = await createTeamInviteResolver(db, { eventId, userId: captain });
  if (!link.ok) throw link.error;
  await joinTeamByInviteResolver(db, {
    token: link.data.token,
    userId: member,
  });
  await db
    .update(hackathonRows)
    .set({ registrationClosesAt: new Date(Date.now() - 2 * HOUR) })
    .where(eq(hackathonRows.eventId, eventId));
  await db
    .update(events)
    .set({ startsAt: new Date(Date.now() - HOUR) })
    .where(eq(events.id, eventId));
  const trackId = id('trk');
  await addHackathonTrack(db, {
    id: trackId,
    eventId,
    track: {
      kind: 'founder_problem',
      title: 'Payments',
      brief: 'Build a tool that a founder in Algiers would use every week.',
      partnerName: null,
      sourceUrls: [],
    },
  });
  return { eventId, teamId: team.data.teamId, trackId };
};

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
    const { eventId, teamId, trackId } = await building();

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
    const { eventId } = await building();
    await save(eventId, 0);

    expect(codeOf(await save(eventId, 0))).toBe('submission_conflict');
    expect(codeOf(await save(eventId, 3))).toBe('submission_conflict');
    expect(
      codeOf(await save(eventId, 1, { trackId: `trk_${'0'.repeat(32)}` })),
    ).toBe('track_not_in_hackathon');
  });

  it('lets only the captain save, and only while the team is building', async () => {
    const { eventId } = await building();

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
    const { eventId, teamId, trackId } = await building();
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
