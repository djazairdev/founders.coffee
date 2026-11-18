import { beforeEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';
import {
  and,
  eq,
  events,
  hackathonJudges,
  hackathonSubmissions,
  hackathons as hackathonRows,
  listHackathonResults,
  operationsAudit,
  publishResults,
  recuseFromEntry,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { members, setupDb } from '../rsvps/resolver.fixtures.js';
import { codeOf, judgeOf, unwrap } from './judging.fixtures.js';
import { setHackathons } from './registration.fixtures.js';
import {
  judgingEnded,
  judgingTwoEntries,
  scoreBoth,
  scored,
} from './results.fixtures.js';
import { publishHackathonResultsResolver } from './results.js';

let db: Db;

const actor = members[3]?.id ?? '';

const publish = (input: {
  eventId: string;
  missingScoresReason?: string;
  tieOrder?: string[];
}) =>
  publishHackathonResultsResolver(db, null, {
    ...hackathons.publishResultsSchema.parse(input),
    actorUserId: actor,
  });

const frozen = (eventId: string) => listHackathonResults(db, eventId);

const publishedAt = async (eventId: string) => {
  const [row] = await db
    .select({ at: hackathonRows.resultsPublishedAt })
    .from(hackathonRows)
    .where(eq(hackathonRows.eventId, eventId));
  return row?.at ?? null;
};

const auditsOf = (eventId: string) =>
  db
    .select({
      action: operationsAudit.action,
      actorUserId: operationsAudit.actorUserId,
      metadata: operationsAudit.metadata,
    })
    .from(operationsAudit)
    .where(
      and(
        eq(operationsAudit.targetId, eventId),
        eq(operationsAudit.action, 'results_published'),
      ),
    );

describe('publishing a hackathon’s results (B-JDG-09, real D1)', () => {
  beforeEach(async () => {
    db = await setupDb();
    await setHackathons(db, true);
  });

  it('freezes each entry as last submitted, with its total, ranks and criteria, audited', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, rival, trackId, criteria } = setup;
    await scoreBoth(db, setup);
    await judgingEnded(db, eventId);

    expect(unwrap(await publish({ eventId }))).toEqual({ published: 2 });

    expect(await publishedAt(eventId)).not.toBeNull();
    const results = await frozen(eventId);
    expect(results).toMatchObject([
      {
        submissionId,
        teamName: 'Byte Club',
        title: 'Ledger',
        trackId,
        trackTitle: 'Payments',
        total: 80,
        rank: 1,
        trackRank: 1,
        tieNote: null,
      },
      {
        submissionId: rival.submissionId,
        title: 'Souk',
        total: 54,
        rank: 2,
        trackRank: 2,
      },
    ]);
    expect(results[0]?.criteria).toEqual(
      expect.arrayContaining([
        {
          criterionId: criteria.impact,
          name: 'Impact',
          weight: 60,
          scale: 10,
          mean: 8,
          judgeCount: 1,
        },
      ]),
    );
    expect(await auditsOf(eventId)).toEqual([
      expect.objectContaining({
        actorUserId: actor,
        metadata: expect.objectContaining({ entries: 2, missingEntries: 0 }),
      }),
    ]);
  });

  it('publishes once: a second try is refused and changes nothing', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);
    await judgingEnded(db, setup.eventId);
    unwrap(await publish({ eventId: setup.eventId }));
    const before = await frozen(setup.eventId);

    expect(codeOf(await publish({ eventId: setup.eventId }))).toBe(
      'results_already_published',
    );

    expect(await frozen(setup.eventId)).toEqual(before);
    expect(await auditsOf(setup.eventId)).toHaveLength(1);
  });

  it('writes nothing when the batch finds the results published, or judging not ended', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId } = setup;
    const attempt = (auditId: string, at: Date) =>
      publishResults(db, {
        eventId,
        actorUserId: actor,
        auditId,
        publishedAt: at,
        certificates: [],
        awards: [],
        metadata: {},
        results: [
          {
            submissionId: setup.submissionId,
            version: 1,
            teamId: 'tea_any',
            teamName: 'Byte Club',
            title: 'Ledger',
            trackId: null,
            trackTitle: null,
            total: 10,
            rank: 1,
            trackRank: null,
            tieNote: null,
            criteria: [],
          },
        ],
      });

    expect(await attempt(id('aud'), new Date())).toBe(false);
    expect(await frozen(eventId)).toEqual([]);
    expect(await auditsOf(eventId)).toEqual([]);

    await judgingEnded(db, eventId);
    expect(await attempt(id('aud'), new Date())).toBe(true);
    expect(await attempt(id('aud'), new Date())).toBe(false);
    expect(await frozen(eventId)).toHaveLength(1);
    expect(await auditsOf(eventId)).toHaveLength(1);
  });

  it('refuses before judging ends, and for a cancelled hackathon', async () => {
    const setup = await judgingTwoEntries(db);
    await scoreBoth(db, setup);

    expect(codeOf(await publish({ eventId: setup.eventId }))).toBe(
      'judging_not_ended',
    );
    await judgingEnded(db, setup.eventId);
    await db
      .update(events)
      .set({ status: 'cancelled' })
      .where(eq(events.id, setup.eventId));
    expect(codeOf(await publish({ eventId: setup.eventId }))).toBe(
      'hackathon_not_editable',
    );
    expect(await publishedAt(setup.eventId)).toBeNull();
    expect(await frozen(setup.eventId)).toEqual([]);
  });

  it('needs a written reason for missing scores, keeps it in the audit and leaves the entry unranked', async () => {
    const { eventId, submissionId, rival, criteria, judge } =
      await judgingTwoEntries(db);
    await scored(db, eventId, judge.judgeId, submissionId, {
      [criteria.impact]: 8,
      [criteria.craft]: 4,
    });
    await judgingEnded(db, eventId);

    expect(codeOf(await publish({ eventId }))).toBe(
      'missing_scores_reason_required',
    );
    expect(await frozen(eventId)).toEqual([]);

    unwrap(
      await publish({ eventId, missingScoresReason: 'A judge fell ill.' }),
    );

    expect(await frozen(eventId)).toMatchObject([
      { submissionId, rank: 1 },
      { submissionId: rival.submissionId, rank: null, total: null },
    ]);
    expect((await auditsOf(eventId))[0]?.metadata).toMatchObject({
      missingEntries: 1,
      missingScoresReason: 'A judge fell ill.',
    });
  });

  it('needs the organiser’s pick for a tie and places the entries that way, noted', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, rival } = setup;
    await scoreBoth(db, setup, true);
    await judgingEnded(db, eventId);

    expect(codeOf(await publish({ eventId }))).toBe('tie_pick_required');

    unwrap(
      await publish({
        eventId,
        tieOrder: [rival.submissionId, submissionId],
      }),
    );

    expect(await frozen(eventId)).toMatchObject([
      { submissionId: rival.submissionId, rank: 1, tieNote: 'organiser_pick' },
      { submissionId, rank: 2, tieNote: 'organiser_pick' },
    ]);
  });

  it('counts only accepted judges who did not recuse, and leaves out a disqualified entry', async () => {
    const setup = await judgingTwoEntries(db);
    const { eventId, submissionId, rival, criteria } = setup;
    await scoreBoth(db, setup);
    const removed = await judgeOf(db, eventId);
    await scored(db, eventId, removed.judgeId, submissionId, {
      [criteria.impact]: 1,
      [criteria.craft]: 1,
    });
    await db
      .update(hackathonJudges)
      .set({ status: 'removed' })
      .where(eq(hackathonJudges.id, removed.judgeId));
    const recused = await judgeOf(db, eventId);
    await scored(db, eventId, recused.judgeId, submissionId, {
      [criteria.impact]: 2,
      [criteria.craft]: 2,
    });
    await recuseFromEntry(db, {
      eventId,
      judgeId: recused.judgeId,
      submissionId,
      reason: 'I mentored this team.',
      actorUserId: recused.userId,
      auditId: id('aud'),
    });
    await db
      .update(hackathonSubmissions)
      .set({ status: 'disqualified' })
      .where(eq(hackathonSubmissions.id, rival.submissionId));
    await judgingEnded(db, eventId);

    unwrap(
      await publish({ eventId, missingScoresReason: 'The third judge left.' }),
    );

    const results = await frozen(eventId);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ submissionId, total: 80, rank: 1 });
    expect(results[0]?.criteria[0]).toMatchObject({ judgeCount: 1 });
  });
});
