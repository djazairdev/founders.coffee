import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  and,
  eq,
  events,
  hackathonJudges,
  hackathonRecusals,
  hackathons as hackathonRows,
  operationsAudit,
  recuseFromEntry,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import {
  listJudgeEntriesResolver,
  recuseFromEntryResolver,
} from './judge-entries.js';
import { setHackathons } from './registration.fixtures.js';
import { saveSubmissionDraftResolver } from './submission-drafts.js';
import { submitSubmissionResolver } from './submission-submit.js';
import { building } from './submission.fixtures.js';

let db: Db;

const HOUR = 3_600_000;
const [captain, member] = members.map((row) => row.id) as [string, string];

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
      title: 'Ledger',
      description: 'A ledger a corner shop keeps on its phone.',
      repositoryUrl: 'https://github.com/byte-club/ledger',
      aiStatement: 'We wrote every line ourselves and used no AI tools.',
      ...values,
    }),
  });

const judgeOf = async (
  eventId: string,
  status: 'accepted' | 'invited' = 'accepted',
) => {
  const userId = id('usr');
  await db
    .insert(user)
    .values({ id: userId, name: 'Judge', email: `${userId}@judges.test` });
  const judgeId = id('jdg');
  await db.insert(hackathonJudges).values({
    id: judgeId,
    eventId,
    userId: status === 'invited' ? null : userId,
    status,
    tokenHash: id('tkh'),
    invitedBy: userId,
  });
  return { userId, judgeId };
};

/** Move the hackathon on to judging: kickoff three hours ago, the deadline an hour ago. */
const toJudging = async (eventId: string) => {
  await db
    .update(events)
    .set({ startsAt: new Date(Date.now() - 3 * HOUR) })
    .where(eq(events.id, eventId));
  await db
    .update(hackathonRows)
    .set({ submissionDeadlineAt: new Date(Date.now() - HOUR) })
    .where(eq(hackathonRows.eventId, eventId));
};

/**
 * A team that submitted "Ledger" and then saved a later draft it never submitted, with the
 * hackathon still building.
 */
const submitted = async () => {
  const { eventId, trackId } = await building(db, [captain, member]);
  const draft = unwrap(await save(eventId, 0, { trackId }));
  const sent = unwrap(
    await submitSubmissionResolver(db, null, {
      eventId,
      userId: captain,
      version: draft.version,
    }),
  );
  unwrap(await save(eventId, sent.version, { trackId, title: 'Ledger 2' }));
  return { eventId, trackId, submissionId: sent.submissionId };
};

describe('judges read entries and recuse (B-JDG-04, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows an accepted judge every entry as it was last submitted, once judging opens', async () => {
    const { eventId, trackId, submissionId } = await submitted();
    const judge = await judgeOf(eventId);
    expect(
      codeOf(
        await listJudgeEntriesResolver(db, { eventId, userId: judge.userId }),
      ),
    ).toBe('judging_not_started');

    await toJudging(eventId);
    const entries = unwrap(
      await listJudgeEntriesResolver(db, { eventId, userId: judge.userId }),
    );
    expect(entries).toEqual([
      expect.objectContaining({
        submissionId,
        teamName: 'Byte Club',
        trackId,
        trackTitle: 'Payments',
        title: 'Ledger',
        repositoryUrl: 'https://github.com/byte-club/ledger',
        aiTools: [],
        submittedAt: expect.any(Number),
      }),
    ]);
  });

  it('shows no entries to a member who does not judge, or whose invite is unanswered', async () => {
    const { eventId } = await submitted();
    await toJudging(eventId);
    const invited = await judgeOf(eventId, 'invited');

    expect(
      codeOf(await listJudgeEntriesResolver(db, { eventId, userId: captain })),
    ).toBe('not_judge');
    expect(
      codeOf(
        await listJudgeEntriesResolver(db, { eventId, userId: invited.userId }),
      ),
    ).toBe('not_judge');
  });

  it('recuses a judge once, with its reason and an audit entry, and hides the entry from them', async () => {
    const { eventId, submissionId } = await submitted();
    await toJudging(eventId);
    const judge = await judgeOf(eventId);
    const other = await judgeOf(eventId);
    const recusal = {
      eventId,
      submissionId,
      userId: judge.userId,
      reason: 'I mentored this team before the hackathon.',
    };

    expect(unwrap(await recuseFromEntryResolver(db, recusal))).toEqual({
      submissionId,
    });
    expect(codeOf(await recuseFromEntryResolver(db, recusal))).toBe(
      'already_recused',
    );
    expect(
      unwrap(
        await listJudgeEntriesResolver(db, { eventId, userId: judge.userId }),
      ),
    ).toEqual([]);
    expect(
      unwrap(
        await listJudgeEntriesResolver(db, { eventId, userId: other.userId }),
      ),
    ).toHaveLength(1);

    const [row] = await db
      .select()
      .from(hackathonRecusals)
      .where(eq(hackathonRecusals.judgeId, judge.judgeId));
    expect(row?.reason).toBe('I mentored this team before the hackathon.');
    const audits = await db
      .select()
      .from(operationsAudit)
      .where(
        and(
          eq(operationsAudit.action, 'recused'),
          eq(operationsAudit.targetId, submissionId),
        ),
      );
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorUserId: judge.userId,
      targetType: 'submission',
      marketCode: 'DZ',
      metadata: { judgeId: judge.judgeId },
    });
  });

  it('refuses a recusal from a member who does not judge, or before judging opens', async () => {
    const { eventId, submissionId } = await submitted();
    const judge = await judgeOf(eventId);
    const recusal = { eventId, submissionId, reason: 'Conflict of interest.' };

    expect(
      codeOf(
        await recuseFromEntryResolver(db, { ...recusal, userId: judge.userId }),
      ),
    ).toBe('judging_not_started');
    await toJudging(eventId);
    expect(
      codeOf(
        await recuseFromEntryResolver(db, { ...recusal, userId: captain }),
      ),
    ).toBe('not_judge');
  });

  it('writes neither a recusal nor its audit when the batch’s own check refuses it', async () => {
    const { eventId, submissionId } = await submitted();
    const judge = await judgeOf(eventId);

    expect(
      await recuseFromEntry(db, {
        eventId,
        judgeId: judge.judgeId,
        submissionId,
        reason: 'Conflict of interest.',
        actorUserId: judge.userId,
        auditId: id('audit'),
      }),
    ).toBe(false);
    expect(
      await db
        .select()
        .from(hackathonRecusals)
        .where(eq(hackathonRecusals.judgeId, judge.judgeId)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(operationsAudit)
        .where(eq(operationsAudit.targetId, submissionId)),
    ).toEqual([]);
  });
});
