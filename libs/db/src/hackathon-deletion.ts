import { and, desc, eq, exists, ne, or, sql } from 'drizzle-orm';

import type { EventStatus } from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { syncChatChannel } from './chat-channels.js';
import { auditStatement } from './operations-audit.js';
import {
  eventOrganisers,
  events,
  hackathonCertificates,
  hackathonInterestLaunches,
  organization,
  scheduledNotifications,
} from './schema.js';

export type HackathonDeletionCandidate = {
  readonly eventId: string;
  readonly title: string;
  readonly slug: string;
  readonly status: EventStatus;
  readonly marketCode: string;
  readonly startsAt: Date;
  readonly organisationName: string | null;
};

export const searchHackathonsForDeletion = async (
  db: Db,
  query: string,
): Promise<readonly HackathonDeletionCandidate[]> => {
  const normalized = query.trim().toLowerCase();
  return db
    .select({
      eventId: events.id,
      title: events.title,
      slug: events.slug,
      status: events.status,
      marketCode: events.marketCode,
      startsAt: events.startsAt,
      organisationName: organization.name,
    })
    .from(events)
    .leftJoin(
      eventOrganisers,
      and(
        eq(eventOrganisers.eventId, events.id),
        eq(eventOrganisers.role, 'lead'),
      ),
    )
    .leftJoin(organization, eq(organization.id, eventOrganisers.organisationId))
    .where(
      and(
        eq(events.kind, 'hackathon'),
        ne(events.status, 'deleted'),
        or(
          sql`instr(lower(${events.id}), ${normalized}) > 0`,
          sql`instr(lower(${events.title}), ${normalized}) > 0`,
          sql`instr(lower(${events.slug}), ${normalized}) > 0`,
        ),
      ),
    )
    .orderBy(desc(events.updatedAt), desc(events.id))
    .limit(20);
};

export const deleteHackathon = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly organisationId?: string;
    readonly actorUserId: string;
    readonly accessSubject: string | null;
    readonly auditId: string;
  },
): Promise<boolean> => {
  const eligible = and(
    eq(events.id, input.eventId),
    eq(events.kind, 'hackathon'),
    ne(events.status, 'deleted'),
    input.organisationId
      ? exists(
          db
            .select({ eventId: eventOrganisers.eventId })
            .from(eventOrganisers)
            .where(
              and(
                eq(eventOrganisers.eventId, events.id),
                eq(eventOrganisers.organisationId, input.organisationId),
                eq(eventOrganisers.role, 'lead'),
              ),
            ),
        )
      : undefined,
  );
  const now = new Date();
  const [, deleted] = await batch(db, [
    auditStatement(
      db,
      {
        id: input.auditId,
        actorUserId: input.actorUserId,
        accessSubject: input.accessSubject,
        action: 'deleted',
        targetType: 'hackathon',
        targetId: input.eventId,
        reasonCode: null,
        metadata: { retention: 'linked records retained' },
      },
      events,
      events.marketCode,
      eligible,
    ),
    db
      .update(events)
      .set({
        status: 'deleted',
        version: sql`${events.version} + 1`,
        updatedAt: now,
      })
      .where(eligible),
    db
      .update(scheduledNotifications)
      .set({ status: 'cancelled', updatedAt: now })
      .where(
        and(
          eq(scheduledNotifications.eventId, input.eventId),
          eq(scheduledNotifications.status, 'pending'),
        ),
      ),
    db
      .update(hackathonInterestLaunches)
      .set({ status: 'cancelled', cancelledAt: now })
      .where(
        and(
          eq(hackathonInterestLaunches.eventId, input.eventId),
          eq(hackathonInterestLaunches.status, 'pending'),
        ),
      ),
    db
      .update(hackathonCertificates)
      .set({ revokedAt: now })
      .where(
        and(
          eq(hackathonCertificates.eventId, input.eventId),
          sql`${hackathonCertificates.revokedAt} is null`,
        ),
      ),
    syncChatChannel(db, input.eventId),
  ]);
  const changes = (deleted as { meta?: { changes?: number } })?.meta?.changes;
  return changes === 1;
};
