import { and, eq } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  eventOrganisers,
  events,
  hackathons,
  organization,
  type Event,
  type Hackathon,
} from './schema.js';

export type HackathonLead = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

export type HackathonDraftRows = {
  readonly event: Event;
  readonly organisation: HackathonLead;
  readonly details: Hackathon | null;
};

const leadOf = and(
  eq(eventOrganisers.eventId, events.id),
  eq(eventOrganisers.role, 'lead'),
);

/** The organisation that leads this hackathon, or `null` when the event is not a hackathon it leads. */
export const readHackathonLeadOrganisation = async (
  db: Db,
  eventId: string,
): Promise<string | null> => {
  const [row] = await db
    .select({ organisationId: eventOrganisers.organisationId })
    .from(events)
    .innerJoin(eventOrganisers, leadOf)
    .where(and(eq(events.id, eventId), eq(events.kind, 'hackathon')))
    .limit(1);
  return row?.organisationId ?? null;
};

/**
 * A hackathon as its organisers manage it (B-HKN-12): its event, the organisation that leads it,
 * and its details once the second step has saved them, `null` before. One query, whatever its status.
 */
export const readHackathonDraft = async (
  db: Db,
  eventId: string,
): Promise<HackathonDraftRows | null> => {
  const [row] = await db
    .select({
      event: events,
      organisation: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      details: hackathons,
    })
    .from(events)
    .innerJoin(eventOrganisers, leadOf)
    .innerJoin(
      organization,
      eq(organization.id, eventOrganisers.organisationId),
    )
    .leftJoin(hackathons, eq(hackathons.eventId, events.id))
    .where(and(eq(events.id, eventId), eq(events.kind, 'hackathon')))
    .limit(1);
  return row ?? null;
};
