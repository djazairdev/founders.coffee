import { inArray } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  and,
  eq,
  scheduledNotifications,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { submitSubmissionResolver } from './submission-submit.js';
import { building } from './submission.fixtures.js';
import { leaveTeamResolver } from './team-changes.js';

let db: Db;

const [captain, mate] = members.map((row) => row.id) as [string, string];

const rowsOf = (
  eventId: string,
  userId: string,
  templateKeys: readonly string[],
) =>
  db
    .select({
      templateKey: scheduledNotifications.templateKey,
      payload: scheduledNotifications.payload,
    })
    .from(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.eventId, eventId),
        eq(scheduledNotifications.userId, userId),
        eq(scheduledNotifications.status, 'pending'),
        inArray(scheduledNotifications.templateKey, [...templateKeys]),
      ),
    );

const DEADLINES = ['hackathon_deadline_24h', 'hackathon_deadline_1h'];
const RECEIPT = ['hackathon_submission_received'];

const bodiesOf = async (eventId: string, userId: string) =>
  (await rowsOf(eventId, userId, DEADLINES)).map(
    (row) => (row.payload as { pushBody: string }).pushBody,
  );

/** A building team of two whose captain saved a complete project, at version 1. */
const saved = async () => {
  const team = await building(db, [captain, mate]);
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
    }),
  });
  if (!draft.ok) throw draft.error;
  return team;
};

const submit = (eventId: string, version: number) =>
  submitSubmissionResolver(db, null, { eventId, userId: captain, version });

describe('deadline reminders and submission receipts (B-SUB-07, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
    await db.update(user).set({ localePref: 'en' });
  });

  it('names the team in each member’s deadline reminders, and opens its project', async () => {
    const { eventId } = await saved();

    for (const userId of [captain, mate]) {
      const rows = await rowsOf(eventId, userId, DEADLINES);
      expect(rows.map((row) => row.templateKey).sort()).toEqual([
        'hackathon_deadline_1h',
        'hackathon_deadline_24h',
      ]);
      for (const row of rows)
        expect(row.payload).toMatchObject({
          pushBody: expect.stringMatching(/^Byte Club has nothing submitted/u),
          pushUrl: expect.stringMatching(/\/en\/hackathon\/.+\/submit$/u),
          html: expect.stringContaining('<strong>Byte Club</strong>'),
        });
    }
  });

  it('tells a member who left their team they are in none', async () => {
    const { eventId } = await saved();
    const left = await leaveTeamResolver(db, { eventId, userId: mate });
    expect(left.ok).toBe(true);

    expect(await bodiesOf(eventId, mate)).toEqual([
      'You are not in a team yet: start or join one to submit a project.',
      'You are not in a team yet, and nothing can be submitted after the deadline.',
    ]);
    expect(await bodiesOf(eventId, captain)).toHaveLength(2);
  });

  it('sends every member a receipt on each submit and withdraws their deadline reminders', async () => {
    const { eventId } = await saved();
    const first = await submit(eventId, 1);
    if (!first.ok) throw first.error;

    for (const userId of [captain, mate]) {
      const [receipt] = await rowsOf(eventId, userId, RECEIPT);
      expect(receipt?.payload).toMatchObject({
        pushTitle: "Byte Club's project is submitted",
        pushBody: expect.stringContaining('submitted Ledger to'),
        pushUrl: expect.stringMatching(/\/en\/hackathon\/.+\/submit$/u),
      });
      expect(await rowsOf(eventId, userId, DEADLINES)).toEqual([]);
    }

    const again = await submit(eventId, first.data.version);
    expect(again.ok).toBe(true);
    expect(await rowsOf(eventId, mate, RECEIPT)).toHaveLength(2);
    expect(await rowsOf(eventId, mate, DEADLINES)).toEqual([]);
  });

  it('sends no receipt for a submit that was refused', async () => {
    const { eventId } = await saved();
    const refused = await submit(eventId, 7);

    expect(refused.ok).toBe(false);
    expect(await rowsOf(eventId, mate, RECEIPT)).toEqual([]);
    expect(await bodiesOf(eventId, mate)).toHaveLength(2);
  });
});
