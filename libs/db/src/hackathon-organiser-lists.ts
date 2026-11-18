import { and, asc, desc, eq } from 'drizzle-orm';

import type {
  AttendanceMode,
  HackathonRegistrationStatus,
  HackathonSubmissionStatus,
} from '@founders-coffee/core';

import type { Db } from './db.js';
import {
  hackathonRegistrations,
  hackathonSubmissions,
  hackathonTeamMembers,
  hackathonTeams,
  hackathonTracks,
  user,
} from './schema.js';

export const HACKATHON_ORGANISER_LIST_MAX = 1000;

export type HackathonParticipant = {
  readonly userId: string;
  readonly name: string;
  readonly attendanceMode: AttendanceMode;
  readonly status: HackathonRegistrationStatus;
  readonly teamName: string | null;
};

/**
 * Everyone who registered for a hackathon, in the order they did, each with the team they are on,
 * for its organisers (B-REG-08). No contact details: the list has no export, and an organiser reads
 * a name and a standing here, not an address to write to.
 */
export const listHackathonParticipants = async (
  db: Db,
  eventId: string,
  limit: number = HACKATHON_ORGANISER_LIST_MAX,
): Promise<{
  readonly participants: readonly HackathonParticipant[];
  readonly isTruncated: boolean;
}> => {
  const rows = await db
    .select({
      userId: hackathonRegistrations.userId,
      name: user.name,
      attendanceMode: hackathonRegistrations.attendanceMode,
      status: hackathonRegistrations.status,
      teamName: hackathonTeams.name,
    })
    .from(hackathonRegistrations)
    .innerJoin(user, eq(user.id, hackathonRegistrations.userId))
    .leftJoin(
      hackathonTeamMembers,
      and(
        eq(hackathonTeamMembers.eventId, hackathonRegistrations.eventId),
        eq(hackathonTeamMembers.userId, hackathonRegistrations.userId),
      ),
    )
    .leftJoin(
      hackathonTeams,
      eq(hackathonTeams.id, hackathonTeamMembers.teamId),
    )
    .where(eq(hackathonRegistrations.eventId, eventId))
    .orderBy(
      asc(hackathonRegistrations.createdAt),
      asc(hackathonRegistrations.id),
    )
    .limit(limit + 1);
  return {
    participants: rows.slice(0, limit),
    isTruncated: rows.length > limit,
  };
};

export type HackathonTeamListing = {
  readonly teamId: string;
  readonly name: string;
  readonly members: readonly {
    readonly userId: string;
    readonly name: string;
    readonly isCaptain: boolean;
  }[];
  readonly trackTitle: string | null;
  readonly submissionStatus: HackathonSubmissionStatus | null;
};

/**
 * Every team of a hackathon with its members, the captain first, and where its entry stands, for its
 * organisers (B-OPS-02). The track is the one its entry names; a team with no entry has neither.
 */
export const listHackathonTeams = async (
  db: Db,
  eventId: string,
  limit: number = HACKATHON_ORGANISER_LIST_MAX,
): Promise<{
  readonly teams: readonly HackathonTeamListing[];
  readonly isTruncated: boolean;
}> => {
  const [teams, members] = await db.batch([
    db
      .select({
        teamId: hackathonTeams.id,
        name: hackathonTeams.name,
        trackTitle: hackathonTracks.title,
        submissionStatus: hackathonSubmissions.status,
      })
      .from(hackathonTeams)
      .leftJoin(
        hackathonSubmissions,
        eq(hackathonSubmissions.teamId, hackathonTeams.id),
      )
      .leftJoin(
        hackathonTracks,
        eq(hackathonTracks.id, hackathonSubmissions.trackId),
      )
      .where(eq(hackathonTeams.eventId, eventId))
      .orderBy(asc(hackathonTeams.createdAt), asc(hackathonTeams.id))
      .limit(limit + 1),
    db
      .select({
        teamId: hackathonTeamMembers.teamId,
        userId: hackathonTeamMembers.userId,
        name: user.name,
        isCaptain: hackathonTeamMembers.isCaptain,
      })
      .from(hackathonTeamMembers)
      .innerJoin(user, eq(user.id, hackathonTeamMembers.userId))
      .where(eq(hackathonTeamMembers.eventId, eventId))
      .orderBy(
        desc(hackathonTeamMembers.isCaptain),
        asc(hackathonTeamMembers.joinedAt),
      ),
  ]);
  return {
    teams: teams.slice(0, limit).map((team) => ({
      ...team,
      members: members
        .filter((member) => member.teamId === team.teamId)
        .map(({ userId, name, isCaptain }) => ({ userId, name, isCaptain })),
    })),
    isTruncated: teams.length > limit,
  };
};
