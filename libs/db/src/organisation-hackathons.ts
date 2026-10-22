import { and, desc, eq } from 'drizzle-orm';

import type { EventStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import { eventOrganisers, events } from './schema.js';

export const ORGANISATION_HACKATHON_LIMIT = 50;

export type OrganisationHackathonRow = {
  readonly id: string;
  readonly title: string;
  readonly cityCode: string;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly status: EventStatus;
};

/**
 * The hackathons an organisation leads, whatever their status, newest first (B-HKN-11): the list its
 * own members see on its page, drafts included. Only its members are shown it, so a draft's title
 * reaches nobody else.
 */
export const listOrganisationHackathons = (
  db: Db,
  organisationId: string,
): Promise<OrganisationHackathonRow[]> =>
  db
    .select({
      id: events.id,
      title: events.title,
      cityCode: events.cityCode,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      status: events.status,
    })
    .from(eventOrganisers)
    .innerJoin(events, eq(events.id, eventOrganisers.eventId))
    .where(
      and(
        eq(eventOrganisers.organisationId, organisationId),
        eq(eventOrganisers.role, 'lead'),
        eq(events.kind, 'hackathon'),
      ),
    )
    .orderBy(desc(events.createdAt), desc(events.id))
    .limit(ORGANISATION_HACKATHON_LIMIT);
