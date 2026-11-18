import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { id } from '@founders-coffee/core';

import { eraseClosedAccount } from './account-closure.js';
import { person } from './account-closure.fixtures.js';
import type { Db } from './db.js';
import { setupDb } from './events.fixtures.js';
import { newTeam } from './hackathon-teams.fixtures.js';
import { createHackathon, hackathonEventRow } from './hackathons.fixtures.js';
import {
  events,
  hackathonCriteria,
  hackathonJudges,
  hackathonRecusals,
  hackathonScores,
  hackathonSubmissions,
  user,
  type NewHackathonJudge,
} from './schema.js';

let db: Db;

const newHackathon = async () => {
  const row = hackathonEventRow();
  await createHackathon(db, row);
  const organiser = await person(db, 'Organiser');
  const criterionId = id('crt');
  await db.insert(hackathonCriteria).values({
    id: criterionId,
    eventId: row.id,
    name: 'Impact',
    description: 'How much the project would help a founder.',
    weight: 100,
    scale: 10,
    position: 0,
  });
  const submissionId = id('sub');
  await db.insert(hackathonSubmissions).values({
    id: submissionId,
    eventId: row.id,
    teamId: await newTeam(db, row.id, 'Byte Club'),
    title: 'Ledger for corner shops',
  });
  return { eventId: row.id, organiser, criterionId, submissionId };
};

type Hackathon = Awaited<ReturnType<typeof newHackathon>>;

const invite = async (
  hackathon: Hackathon,
  values: Partial<NewHackathonJudge> = {},
) => {
  const judgeId = id('jdg');
  await db.insert(hackathonJudges).values({
    id: judgeId,
    eventId: hackathon.eventId,
    tokenHash: id('tkh'),
    invitedBy: hackathon.organiser.id,
    ...values,
  });
  return judgeId;
};

const accepted = async (hackathon: Hackathon, name = 'Judge') => {
  const judge = await person(db, name);
  const judgeId = await invite(hackathon, {
    userId: judge.id,
    status: 'accepted',
    respondedAt: new Date(),
  });
  return { judge, judgeId };
};

const score = (
  hackathon: Hackathon,
  judgeId: string,
  values: Partial<typeof hackathonScores.$inferInsert> = {},
) =>
  db.insert(hackathonScores).values({
    submissionId: hackathon.submissionId,
    judgeId,
    criterionId: hackathon.criterionId,
    eventId: hackathon.eventId,
    value: 8,
    ...values,
  });

const recuse = (
  hackathon: Hackathon,
  judgeId: string,
  values: Partial<typeof hackathonRecusals.$inferInsert> = {},
) =>
  db.insert(hackathonRecusals).values({
    judgeId,
    submissionId: hackathon.submissionId,
    eventId: hackathon.eventId,
    reason: 'I mentored this team before the hackathon.',
    ...values,
  });

const rowsOf = async (eventId: string) => ({
  judges: await db
    .select()
    .from(hackathonJudges)
    .where(eq(hackathonJudges.eventId, eventId)),
  scores: await db
    .select()
    .from(hackathonScores)
    .where(eq(hackathonScores.eventId, eventId)),
  recusals: await db
    .select()
    .from(hackathonRecusals)
    .where(eq(hackathonRecusals.eventId, eventId)),
});

describe('judges, recusals and scores (B-JDG-01, real D1)', () => {
  beforeAll(async () => {
    db = await setupDb();
  });

  it('starts a judge as an invite link, and holds a member to one place per hackathon', async () => {
    const hackathon = await newHackathon();
    const judgeId = await invite(hackathon);
    const [row] = (await rowsOf(hackathon.eventId)).judges;
    expect(row).toMatchObject({ id: judgeId, status: 'invited', userId: null });

    await invite(hackathon);
    const { judge } = await accepted(hackathon);

    await expect(invite(hackathon, { userId: judge.id })).rejects.toThrow();
    await expect(invite(hackathon, { status: 'accepted' })).rejects.toThrow();
    await expect(
      invite(hackathon, { tokenHash: row?.tokenHash }),
    ).rejects.toThrow();
  });

  it('scores an entry once per judge and criterion, within 1 to 10, with a comment of up to 1000 characters', async () => {
    const hackathon = await newHackathon();
    const { judgeId } = await accepted(hackathon);

    await score(hackathon, judgeId, { comment: 'Clear problem, early demo.' });
    await expect(score(hackathon, judgeId)).rejects.toThrow();

    const other = await newHackathon();
    const { judgeId: otherJudge } = await accepted(other);
    for (const value of [0, 11])
      await expect(score(other, otherJudge, { value })).rejects.toThrow();
    await expect(
      score(other, otherJudge, { comment: 'x'.repeat(1001) }),
    ).rejects.toThrow();
    await score(other, otherJudge, { value: 1, comment: 'x'.repeat(1000) });
  });

  it("holds a score and a recusal to the judge's own hackathon", async () => {
    const hackathon = await newHackathon();
    const other = await newHackathon();
    const { judgeId } = await accepted(hackathon);

    await expect(
      score(hackathon, judgeId, { criterionId: other.criterionId }),
    ).rejects.toThrow();
    await expect(
      score(hackathon, judgeId, { submissionId: other.submissionId }),
    ).rejects.toThrow();
    await expect(
      score(hackathon, judgeId, {
        eventId: other.eventId,
        submissionId: other.submissionId,
        criterionId: other.criterionId,
      }),
    ).rejects.toThrow();
    await expect(
      recuse(hackathon, judgeId, { submissionId: other.submissionId }),
    ).rejects.toThrow();
  });

  it('recuses a judge from an entry once, and only with a reason', async () => {
    const hackathon = await newHackathon();
    const { judgeId } = await accepted(hackathon);

    await expect(
      recuse(hackathon, judgeId, { reason: '   ' }),
    ).rejects.toThrow();
    await expect(
      recuse(hackathon, judgeId, { reason: 'x'.repeat(501) }),
    ).rejects.toThrow();
    await recuse(hackathon, judgeId);
    await expect(recuse(hackathon, judgeId)).rejects.toThrow();
  });

  it("keeps a closed account's places, scores and recusals against the tombstone", async () => {
    const hackathon = await newHackathon();
    const { judge, judgeId } = await accepted(hackathon, 'Closing');
    await score(hackathon, judgeId);
    await recuse(hackathon, judgeId);
    await db
      .update(user)
      .set({ accountState: 'closing', closedAt: new Date() })
      .where(eq(user.id, judge.id));

    await eraseClosedAccount(db, { ...judge, phoneNumber: null });

    const rows = await rowsOf(hackathon.eventId);
    expect(rows.judges).toMatchObject([
      { id: judgeId, userId: judge.id, status: 'accepted' },
    ]);
    expect(rows.scores).toHaveLength(1);
    expect(rows.recusals).toHaveLength(1);
    const [tombstone] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, judge.id));
    expect(tombstone?.email).not.toBe(judge.email);
  });

  it('keeps a criterion with scores, and takes everything with the hackathon', async () => {
    const hackathon = await newHackathon();
    const { judgeId } = await accepted(hackathon);
    await score(hackathon, judgeId);
    await recuse(hackathon, judgeId);

    await expect(
      db
        .delete(hackathonCriteria)
        .where(eq(hackathonCriteria.id, hackathon.criterionId)),
    ).rejects.toThrow();

    await db.delete(events).where(eq(events.id, hackathon.eventId));

    expect(await rowsOf(hackathon.eventId)).toEqual({
      judges: [],
      scores: [],
      recusals: [],
    });
  });
});
