import { and, eq, sql } from 'drizzle-orm';

import type { HackathonRegistrationStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import { hackathonRegistrations, hackathonTeamMembers } from './schema.js';

type Participant = { readonly eventId: string; readonly userId: string };

export type ParticipantStanding = {
  readonly status: HackathonRegistrationStatus | null;
  readonly membership: {
    readonly teamId: string;
    readonly isCaptain: boolean;
  } | null;
  readonly teamSize: number;
};

/**
 * Where a member stands in a hackathon: their registration's status, the team they are in and
 * whether they captain it, and how many people are in it. One query, for the rules that decide
 * withdrawing (B-REG-04) and starting a team (B-TEAM-03).
 */
export const readParticipantStanding = async (
  db: Db,
  { eventId, userId }: Participant,
): Promise<ParticipantStanding> => {
  const [row] = await db
    .select({
      status: hackathonRegistrations.status,
      teamId: hackathonTeamMembers.teamId,
      isCaptain: hackathonTeamMembers.isCaptain,
      teamSize: sql<number>`(SELECT count(*) FROM ${hackathonTeamMembers} other WHERE other.team_id = ${hackathonTeamMembers.teamId})`,
    })
    .from(hackathonRegistrations)
    .leftJoin(
      hackathonTeamMembers,
      and(
        eq(hackathonTeamMembers.eventId, hackathonRegistrations.eventId),
        eq(hackathonTeamMembers.userId, hackathonRegistrations.userId),
      ),
    )
    .where(
      and(
        eq(hackathonRegistrations.eventId, eventId),
        eq(hackathonRegistrations.userId, userId),
      ),
    )
    .limit(1);
  if (!row) return { status: null, membership: null, teamSize: 0 };
  return {
    status: row.status,
    membership:
      row.teamId === null
        ? null
        : { teamId: row.teamId, isCaptain: row.isCaptain ?? false },
    teamSize: row.teamId === null ? 0 : Number(row.teamSize),
  };
};

/** The members holding a place in a hackathon (B-HKN-21), not those waiting for one or gone. */
export const listRegisteredParticipantIds = async (
  db: Db,
  eventId: string,
): Promise<string[]> =>
  (
    await db
      .select({ userId: hackathonRegistrations.userId })
      .from(hackathonRegistrations)
      .where(
        and(
          eq(hackathonRegistrations.eventId, eventId),
          eq(hackathonRegistrations.status, 'registered'),
        ),
      )
  ).map((row) => row.userId);
