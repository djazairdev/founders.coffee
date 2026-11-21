import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  events,
  hackathons as hackathonTable,
  listAuditForTarget,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import {
  codeOf,
  draftHackathon,
  setupHackathonDb,
} from '../hackathons/edit.fixtures.js';
import { readyHackathon } from '../hackathons/review.fixtures.js';
import { createHackathonDecisionNotice } from './hackathon-decision-email.js';
import { decideHackathonReviewResolver } from './hackathon-review.js';

const OPERATOR = 'usr_hackathon_operator';
let db: Db;

const decide = (eventId: string, version: number) =>
  decideHackathonReviewResolver(db, createHackathonDecisionNotice(null), null, {
    decision: hackathons.hackathonReviewDecisionSchema.parse({
      eventId,
      version,
      decision: 'approve',
    }),
    actorUserId: OPERATOR,
    accessSubject: 'access-subject-review',
  });

const trail = (eventId: string) =>
  listAuditForTarget(db, {
    targetType: 'hackathon',
    targetId: eventId,
    limit: 10,
  });

describe('publishing hackathon drafts requires valid saved details (#551)', () => {
  beforeEach(async () => {
    db = await setupHackathonDb();
  });

  it('keeps a draft event without details unpublished', async () => {
    const { eventId } = await draftHackathon(db);
    const [event] = await db
      .select({ version: events.version })
      .from(events)
      .where(eq(events.id, eventId));
    if (!event) throw new Error('The event was not created');

    expect(codeOf(await decide(eventId, event.version))).toBe(
      'hackathon_details_required',
    );
    const [eventAfter] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, eventId));
    expect(eventAfter?.status).toBe('draft');
    expect(await trail(eventId)).toEqual([]);
  });

  it('keeps persisted details that fail shared validation unpublished', async () => {
    const { eventId, version } = await readyHackathon(db);
    await db
      .update(hackathonTable)
      .set({ aiPolicyNote: null })
      .where(eq(hackathonTable.eventId, eventId));

    expect(codeOf(await decide(eventId, version))).toBe(
      'hackathon_details_required',
    );
    const [event] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, eventId));
    expect(event?.status).toBe('draft');
    expect(await trail(eventId)).toEqual([]);
  });
});
