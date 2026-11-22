import { eq, sql } from 'drizzle-orm';

import type { CloseoutOutcome } from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { auditStatement } from './operations-audit.js';
import { eventCloseouts, events } from './schema.js';

export interface CreateAdminCloseoutInput {
  readonly eventId: string;
  readonly actorId: string;
  readonly accessSubject: string | null;
  readonly outcome: CloseoutOutcome;
  readonly auditId: string;
}

export type AdminCloseoutCreationOutcome =
  'created' | 'already_closed' | 'not_eligible';

const eligibleMeetup = (eventId: string, outcome: CloseoutOutcome) => sql`
  ${events.id} = ${eventId}
  AND ${events.kind} = 'meetup'
  AND ${events.status} = 'published'
  AND ${events.endsAt} IS NOT NULL
  AND ${events.endsAt} <= unixepoch()
  ${
    outcome === 'did_not_happen'
      ? sql`AND NOT EXISTS (
        SELECT 1 FROM event_attendance WHERE event_id = ${eventId}
      ) AND NOT EXISTS (
        SELECT 1 FROM event_feedback WHERE event_id = ${eventId}
      )`
      : sql``
  }
`;

const eligibleAndOpen = (eventId: string, outcome: CloseoutOutcome) => sql`
  ${eligibleMeetup(eventId, outcome)}
  AND NOT EXISTS (
    SELECT 1 FROM event_closeouts WHERE event_id = ${eventId}
  )
`;

export const createAdminCloseout = async (
  db: Db,
  input: CreateAdminCloseoutInput,
): Promise<AdminCloseoutCreationOutcome> => {
  const eligible = eligibleMeetup(input.eventId, input.outcome);
  const [, inserted] = await batch(db, [
    auditStatement(
      db,
      {
        id: input.auditId,
        actorUserId: input.actorId,
        accessSubject: input.accessSubject,
        action: 'admin_closeout_created',
        targetType: 'closeout',
        targetId: input.eventId,
        reasonCode: 'delivery_recovery',
        metadata: {
          provenance: 'admin',
          outcome: input.outcome,
          attendanceRecorded: false,
        },
      },
      events,
      events.marketCode,
      eligibleAndOpen(input.eventId, input.outcome),
    ),
    db
      .insert(eventCloseouts)
      .select(
        db
          .select({
            eventId: events.id,
            marketCode: events.marketCode,
            stateCode: events.stateCode,
            cityCode: events.cityCode,
            outcome: sql<string>`${input.outcome}`.as('outcome'),
            walkInCount: sql<number>`0`.as('walk_in_count'),
            wouldHostAgain: sql<number | null>`NULL`.as('would_host_again'),
            hostFriction: sql<string>`'[]'`.as('host_friction'),
            privateNote: sql<string | null>`NULL`.as('private_note'),
            submittedByUserId: sql<string>`${input.actorId}`.as(
              'submitted_by_user_id',
            ),
            submittedAt: sql<number>`unixepoch()`.as('submitted_at'),
            updatedByUserId: sql<string | null>`NULL`.as('updated_by_user_id'),
            updatedAt: sql<number>`unixepoch()`.as('updated_at'),
            version: sql<number>`0`.as('version'),
          })
          .from(events)
          .where(eligible),
      )
      .onConflictDoNothing(),
  ]);

  const changes = (inserted as { meta?: { changes?: number } })?.meta?.changes;
  if (changes) return 'created';

  const closed = await db
    .select({ eventId: eventCloseouts.eventId })
    .from(eventCloseouts)
    .where(eq(eventCloseouts.eventId, input.eventId))
    .limit(1);
  return closed.length > 0 ? 'already_closed' : 'not_eligible';
};
