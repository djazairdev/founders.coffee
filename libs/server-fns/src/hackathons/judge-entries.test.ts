import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  and,
  eq,
  hackathonRecusals,
  operationsAudit,
  recuseFromEntry,
  type Db,
} from '@founders-coffee/db';

import { setupDb } from '../rsvps/resolver.fixtures.js';
import {
  captain,
  codeOf,
  judgeOf,
  submitted,
  toJudging,
  unwrap,
} from './judging.fixtures.js';
import {
  listJudgeEntriesResolver,
  recuseFromEntryResolver,
} from './judge-entries.js';
import { setHackathons } from './registration.fixtures.js';

let db: Db;

describe('judges read entries and recuse (B-JDG-04, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('shows an accepted judge every entry as it was last submitted, once judging opens', async () => {
    const { eventId, trackId, submissionId } = await submitted(db);
    const judge = await judgeOf(db, eventId);
    expect(
      codeOf(
        await listJudgeEntriesResolver(db, { eventId, userId: judge.userId }),
      ),
    ).toBe('judging_not_started');

    await toJudging(db, eventId);
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
    const { eventId } = await submitted(db);
    await toJudging(db, eventId);
    const invited = await judgeOf(db, eventId, 'invited');

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
    const { eventId, submissionId } = await submitted(db);
    await toJudging(db, eventId);
    const judge = await judgeOf(db, eventId);
    const other = await judgeOf(db, eventId);
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
    const { eventId, submissionId } = await submitted(db);
    const judge = await judgeOf(db, eventId);
    const recusal = { eventId, submissionId, reason: 'Conflict of interest.' };

    expect(
      codeOf(
        await recuseFromEntryResolver(db, { ...recusal, userId: judge.userId }),
      ),
    ).toBe('judging_not_started');
    await toJudging(db, eventId);
    expect(
      codeOf(
        await recuseFromEntryResolver(db, { ...recusal, userId: captain }),
      ),
    ).toBe('not_judge');
  });

  it('writes neither a recusal nor its audit when the batch’s own check refuses it', async () => {
    const { eventId, submissionId } = await submitted(db);
    const judge = await judgeOf(db, eventId);

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
