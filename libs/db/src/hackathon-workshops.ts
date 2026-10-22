import { and, asc, eq, gte, inArray, lt, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import type { EventFormat } from '@founders-coffee/core';

import type { Db } from './db.js';
import { visibleHost } from './profile-access.js';
import { eventOrganisers, events, hackathons } from './schema.js';

const HACKATHON_WORKSHOPS_LIMIT = 6;

export type HackathonWorkshop = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly format: EventFormat;
  readonly startsAt: Date;
};

/**
 * The workshops a hackathon's page lists (B-HKN-26): published workshops that one of the
 * hackathon's own organisations runs in its market, from the day registration opens until kickoff,
 * soonest first. Running them as the organisation is how an organiser links them. `eventId` may be
 * SQL that yields the id, such as the event a page reads by its address in the same batch.
 */
export const hackathonWorkshopsQuery = (db: Db, eventId: string | SQL) => {
  const hackathon = alias(events, 'workshop_hackathon');
  const theirs = alias(eventOrganisers, 'workshop_organiser');
  return db
    .selectDistinct({
      id: events.id,
      slug: events.slug,
      title: events.title,
      format: events.format,
      startsAt: events.startsAt,
    })
    .from(events)
    .innerJoin(hackathon, eq(hackathon.id, eventId))
    .innerJoin(hackathons, eq(hackathons.eventId, hackathon.id))
    .innerJoin(eventOrganisers, eq(eventOrganisers.eventId, events.id))
    .where(
      and(
        eq(events.kind, 'workshop'),
        eq(events.status, 'published'),
        eq(events.marketCode, hackathon.marketCode),
        gte(events.startsAt, hackathons.registrationOpensAt),
        lt(events.startsAt, hackathon.startsAt),
        visibleHost(events.hostId),
        inArray(
          eventOrganisers.organisationId,
          db
            .select({ id: theirs.organisationId })
            .from(theirs)
            .where(eq(theirs.eventId, hackathon.id)),
        ),
      ),
    )
    .orderBy(asc(events.startsAt), asc(events.id))
    .limit(HACKATHON_WORKSHOPS_LIMIT);
};
