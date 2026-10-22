import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ok } from '@founders-coffee/core';
import {
  eq,
  events,
  hackathons as hackathonTable,
  listAuditForTarget,
  member,
  scheduledNotifications,
  user,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import type { EmailProvider, SendEmailInput } from '@founders-coffee/email';
import type { Metrics } from '@founders-coffee/observability';

import { TEST_HOST_ID } from '../events/resolver.fixtures.js';
import { hackathonDraftResolver } from '../hackathons/draft-view.js';
import {
  codeOf,
  ORGANISATION,
  setupHackathonDb,
} from '../hackathons/edit.fixtures.js';
import {
  readyHackathon,
  submittedHackathon,
} from '../hackathons/review.fixtures.js';
import { submitHackathonForReviewResolver } from '../hackathons/review.js';
import { createHackathonDecisionNotice } from './hackathon-decision-email.js';
import { decideHackathonReviewResolver } from './hackathon-review.js';

const OPERATOR = 'usr_hackathon_operator';
const OWNER = 'usr_hackathon_owner';
const sent: SendEmailInput[] = [];
let db: Db;

const recording: EmailProvider = {
  name: 'recording',
  send: async (input) => {
    sent.push(input);
    return ok({ messageId: `msg_${sent.length}` });
  },
};

const decide = (
  decision: unknown,
  metrics: Metrics | null = null,
  provider: EmailProvider | null = recording,
) =>
  decideHackathonReviewResolver(
    db,
    createHackathonDecisionNotice(provider),
    metrics,
    {
      decision: hackathons.hackathonReviewDecisionSchema.parse(decision),
      actorUserId: OPERATOR,
      accessSubject: 'access-subject-review',
    },
  );

const stateOf = async (eventId: string) =>
  (
    await db
      .select({
        eventStatus: events.status,
        version: events.version,
        reviewStatus: hackathonTable.reviewStatus,
        reviewNote: hackathonTable.reviewNote,
      })
      .from(events)
      .innerJoin(hackathonTable, eq(hackathonTable.eventId, events.id))
      .where(eq(events.id, eventId))
  )[0];

const trail = (eventId: string) =>
  listAuditForTarget(db, {
    targetType: 'hackathon',
    targetId: eventId,
    limit: 10,
  });

describe('reviewing hackathons (B-HKN-08, real D1)', () => {
  beforeEach(async () => {
    db = await setupHackathonDb();
    sent.length = 0;
    await db
      .insert(user)
      .values([
        {
          id: OPERATOR,
          name: 'Operator',
          email: 'operator@review.test',
          emailVerified: true,
          role: 'admin',
        },
        {
          id: OWNER,
          name: 'Owner',
          email: 'owner@review.test',
          emailVerified: true,
          localePref: 'fr',
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(member)
      .values({
        id: 'mem_hackathon_owner',
        organizationId: ORGANISATION,
        userId: OWNER,
        role: 'owner',
      })
      .onConflictDoNothing();
  });

  it('approves: publishes the event, audits, counts it and emails the organisers', async () => {
    const trackEvent = vi.fn();
    const { eventId, version } = await submittedHackathon(db);

    const result = await decide({ eventId, decision: 'approve' }, {
      trackEvent,
    } as unknown as Metrics);

    expect(result).toEqual({
      ok: true,
      data: { eventId, decision: 'approve' },
    });
    expect(await stateOf(eventId)).toEqual({
      eventStatus: 'published',
      version: version + 1,
      reviewStatus: 'approved',
      reviewNote: null,
    });
    expect(await trail(eventId)).toEqual([
      expect.objectContaining({
        action: 'approved',
        targetType: 'hackathon',
        marketCode: 'DZ',
        actorUserId: OPERATOR,
        accessSubject: 'access-subject-review',
      }),
    ]);
    expect(trackEvent).toHaveBeenCalledWith('hackathon_published', {
      market: 'DZ',
      hackathon: eventId,
    });
    const [host] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, TEST_HOST_ID));
    expect(sent.map((email) => email.to).sort()).toEqual(
      [host?.email, 'owner@review.test'].sort(),
    );
    expect(
      sent.find((email) => email.to === 'owner@review.test')?.subject,
    ).toBe('Algiers Builders Hackathon est publié sur Founders Coffee');
  });

  it('schedules the organisers’ reminders on approval, each in their language', async () => {
    const { eventId } = await submittedHackathon(db);

    await decide({ eventId, decision: 'approve' });

    const reminders = await db
      .select({
        userId: scheduledNotifications.userId,
        templateKey: scheduledNotifications.templateKey,
        payload: scheduledNotifications.payload,
      })
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.eventId, eventId));
    expect(
      reminders.map((row) => `${row.userId} ${row.templateKey}`).sort(),
    ).toEqual(
      [
        `${OWNER} hackathon_judging_open`,
        `${OWNER} hackathon_registration_closing`,
        `${TEST_HOST_ID} hackathon_judging_open`,
        `${TEST_HOST_ID} hackathon_registration_closing`,
      ].sort(),
    );
    expect(
      reminders.find(
        (row) =>
          row.userId === OWNER && row.templateKey === 'hackathon_judging_open',
      )?.payload,
    ).toMatchObject({
      pushTitle:
        'L’évaluation du hackathon « Algiers Builders Hackathon » a commencé',
    });
  });

  it('rejects with a note: keeps it a draft the organisers can change and send again', async () => {
    const { eventId, version } = await submittedHackathon(db);

    const result = await decide({
      eventId,
      decision: 'reject',
      note: 'Name who judges, and how teams are formed.',
    });

    expect(result.ok).toBe(true);
    expect(await stateOf(eventId)).toEqual({
      eventStatus: 'draft',
      version: version + 1,
      reviewStatus: 'rejected',
      reviewNote: 'Name who judges, and how teams are formed.',
    });
    expect(await trail(eventId)).toEqual([
      expect.objectContaining({ action: 'rejected' }),
    ]);
    expect(sent[0]?.text).toContain(
      'Name who judges, and how teams are formed.',
    );
    const draft = await hackathonDraftResolver(db, eventId);
    expect(draft.ok && draft.data.isEditable).toBe(true);
    const again = await submitHackathonForReviewResolver(db, {
      eventId,
      version: version + 1,
      organisationId: ORGANISATION,
    });
    expect(again.ok).toBe(true);
  });

  it('refuses a hackathon not sent for review, and leaves no trail', async () => {
    const { eventId } = await readyHackathon(db);

    expect(codeOf(await decide({ eventId, decision: 'approve' }))).toBe(
      'invalid_hackathon_transition',
    );
    expect((await stateOf(eventId))?.eventStatus).toBe('draft');
    expect(await trail(eventId)).toEqual([]);
    expect(sent).toEqual([]);
  });

  it('lets one of two operators deciding at once win', async () => {
    const { eventId } = await submittedHackathon(db);

    const results = await Promise.all([
      decide({ eventId, decision: 'approve' }),
      decide({
        eventId,
        decision: 'reject',
        note: 'Add a code of conduct contact.',
      }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      results.map((result) => (result.ok ? null : result.error.code)),
    ).toContain('invalid_hackathon_transition');
    expect(await trail(eventId)).toHaveLength(1);
  });

  it('keeps the decision when no email can be sent', async () => {
    const { eventId } = await submittedHackathon(db);

    const result = await decide({ eventId, decision: 'approve' }, null, null);

    expect(result.ok).toBe(true);
    expect((await stateOf(eventId))?.eventStatus).toBe('published');
  });
});
