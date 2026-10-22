import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  hackathonInterestLaunches,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { createHackathonDecisionNotice } from '../admin/hackathon-decision-email.js';
import { decideHackathonReviewResolver } from '../admin/hackathon-review.js';
import { setupHackathonDb } from './edit.fixtures.js';
import { submittedHackathon } from './review.fixtures.js';

const OPERATOR = 'usr_interest_operator';
let db: Db;

const decide = (eventId: string, decision: 'approve' | 'reject') =>
  decideHackathonReviewResolver(db, createHackathonDecisionNotice(null), null, {
    decision: hackathons.hackathonReviewDecisionSchema.parse({
      eventId,
      decision,
      ...(decision === 'reject' ? { note: 'Name the judges.' } : {}),
    }),
    actorUserId: OPERATOR,
    accessSubject: null,
  });

const roundsOf = (eventId: string) =>
  db
    .select({
      marketCode: hackathonInterestLaunches.marketCode,
      status: hackathonInterestLaunches.status,
    })
    .from(hackathonInterestLaunches)
    .where(eq(hackathonInterestLaunches.eventId, eventId));

describe('the interest list’s round, opened on approval (B-ANN-05, real D1)', () => {
  beforeEach(async () => {
    db = await setupHackathonDb();
    await db.delete(hackathonInterestLaunches).run();
    await db
      .insert(user)
      .values({
        id: OPERATOR,
        name: 'Operator',
        email: 'operator@interest.test',
        emailVerified: true,
        role: 'admin',
      })
      .onConflictDoNothing();
  });

  it('owes the market’s list its notice once its first hackathon is approved, and only then', async () => {
    const first = await submittedHackathon(db);
    const second = await submittedHackathon(db);

    await decide(first.eventId, 'approve');
    await decide(second.eventId, 'approve');

    expect(await roundsOf(first.eventId)).toEqual([
      { marketCode: 'DZ', status: 'pending' },
    ]);
    expect(await roundsOf(second.eventId)).toEqual([]);
  });

  it('owes nothing for a hackathon sent back to its organisers', async () => {
    const rejected = await submittedHackathon(db);

    await decide(rejected.eventId, 'reject');

    expect(await roundsOf(rejected.eventId)).toEqual([]);
  });
});
