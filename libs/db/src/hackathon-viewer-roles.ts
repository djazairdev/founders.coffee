import { and, eq } from 'drizzle-orm';

import type { OrganisationStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import {
  eventOrganisers,
  events,
  hackathonJudges,
  member,
  organization,
} from './schema.js';

export type HackathonViewerRoles = {
  readonly isJudge: boolean;
  readonly leadMembership: {
    readonly status: OrganisationStatus;
    readonly role: string;
  } | null;
};

/**
 * The viewer's accepted judge place and membership of the organisation leading the hackathon,
 * read together for its page. The destination routes still authorise access.
 */
export const readHackathonViewerRoles = async (
  db: Db,
  input: { readonly eventId: string; readonly userId: string },
): Promise<HackathonViewerRoles> => {
  const [row] = await db
    .select({
      judgeId: hackathonJudges.id,
      leadStatus: organization.status,
      leadRole: member.role,
    })
    .from(events)
    .leftJoin(
      hackathonJudges,
      and(
        eq(hackathonJudges.eventId, events.id),
        eq(hackathonJudges.userId, input.userId),
        eq(hackathonJudges.status, 'accepted'),
      ),
    )
    .leftJoin(
      eventOrganisers,
      and(
        eq(eventOrganisers.eventId, events.id),
        eq(eventOrganisers.role, 'lead'),
      ),
    )
    .leftJoin(organization, eq(organization.id, eventOrganisers.organisationId))
    .leftJoin(
      member,
      and(
        eq(member.organizationId, organization.id),
        eq(member.userId, input.userId),
      ),
    )
    .where(eq(events.id, input.eventId));
  return {
    isJudge: Boolean(row?.judgeId),
    leadMembership:
      row?.leadRole && row.leadStatus
        ? { status: row.leadStatus, role: row.leadRole }
        : null,
  };
};
