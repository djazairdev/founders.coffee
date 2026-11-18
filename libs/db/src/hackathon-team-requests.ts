import { and, eq, ne, sql, type SQL } from 'drizzle-orm';

import type { HackathonTeamRequestStatus } from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { mayTakeTeamPlace } from './hackathon-team-joining.js';
import { bound } from './insert-select.js';
import {
  events,
  hackathons,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
} from './schema.js';

export type TeamRequestRead = {
  readonly id: string;
  readonly teamId: string;
  readonly eventId: string;
  readonly userId: string;
  readonly status: HackathonTeamRequestStatus;
};

export type TeamRead = {
  readonly teamId: string;
  readonly size: number;
  readonly teamMax: number;
};

const isChanged = (result: unknown): boolean =>
  ((result as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0;

/** A team of the hackathon, with how many people are in it and the most the hackathon allows. */
export const readTeam = async (
  db: Db,
  input: { readonly eventId: string; readonly teamId: string },
): Promise<TeamRead | null> => {
  const [row] = await db
    .select({
      teamId: hackathonTeams.id,
      size: sql<number>`(SELECT count(*) FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${hackathonTeams.id})`,
      teamMax: hackathons.teamMax,
    })
    .from(hackathonTeams)
    .innerJoin(hackathons, eq(hackathons.eventId, hackathonTeams.eventId))
    .where(
      and(
        eq(hackathonTeams.id, input.teamId),
        eq(hackathonTeams.eventId, input.eventId),
      ),
    );
  return row ? { ...row, size: Number(row.size) } : null;
};

/** Whether the member has a pending request to join the team. */
export const hasPendingTeamRequest = async (
  db: Db,
  input: { readonly teamId: string; readonly userId: string },
): Promise<boolean> => {
  const [row] = await db
    .select({ id: hackathonTeamRequests.id })
    .from(hackathonTeamRequests)
    .where(
      and(
        eq(hackathonTeamRequests.teamId, input.teamId),
        eq(hackathonTeamRequests.userId, input.userId),
        eq(hackathonTeamRequests.status, 'pending'),
      ),
    );
  return row !== undefined;
};

/**
 * Ask to join a team (B-TEAM-05), written from the team's own row only while the member could join
 * it now and has no pending request to it, so the partial unique index is never what refuses a
 * second one. Returns whether the request was made.
 */
export const createTeamRequest = async (
  db: Db,
  input: {
    readonly id: string;
    readonly eventId: string;
    readonly teamId: string;
    readonly userId: string;
  },
): Promise<boolean> => {
  const result = await db.insert(hackathonTeamRequests).select(
    db
      .select({
        id: bound(input.id, 'id'),
        teamId: hackathonTeams.id,
        eventId: hackathonTeams.eventId,
        userId: bound(input.userId, 'user_id'),
        status: sql<HackathonTeamRequestStatus>`'pending'`.as('status'),
        createdAt: sql`unixepoch()`.as('created_at'),
        decidedAt: bound(null, 'decided_at'),
      })
      .from(hackathonTeams)
      .innerJoin(hackathons, eq(hackathons.eventId, hackathonTeams.eventId))
      .innerJoin(events, eq(events.id, hackathonTeams.eventId))
      .where(
        and(
          eq(hackathonTeams.id, input.teamId),
          eq(hackathonTeams.eventId, input.eventId),
          mayTakeTeamPlace(input.userId),
          sql`NOT EXISTS (SELECT 1 FROM ${hackathonTeamRequests} WHERE ${hackathonTeamRequests.teamId} = ${input.teamId} AND ${hackathonTeamRequests.userId} = ${input.userId} AND ${hackathonTeamRequests.status} = 'pending')`,
        ),
      ),
  );
  return isChanged(result);
};

/** A request to join a team of the hackathon, or `null` when it has none by that id. */
export const readTeamRequest = async (
  db: Db,
  input: { readonly eventId: string; readonly requestId: string },
): Promise<TeamRequestRead | null> => {
  const [row] = await db
    .select({
      id: hackathonTeamRequests.id,
      teamId: hackathonTeamRequests.teamId,
      eventId: hackathonTeamRequests.eventId,
      userId: hackathonTeamRequests.userId,
      status: hackathonTeamRequests.status,
    })
    .from(hackathonTeamRequests)
    .where(
      and(
        eq(hackathonTeamRequests.id, input.requestId),
        eq(hackathonTeamRequests.eventId, input.eventId),
      ),
    );
  return row ?? null;
};

type Answer = {
  readonly eventId: string;
  readonly requestId: string;
  readonly captainId: string;
};

/** The pending request, of a team the actor captains. */
const pendingForCaptain = (input: Answer): SQL =>
  sql`${hackathonTeamRequests.id} = ${input.requestId} AND ${hackathonTeamRequests.eventId} = ${input.eventId} AND ${hackathonTeamRequests.status} = 'pending' AND EXISTS (SELECT 1 FROM ${hackathonTeamMembers} captain WHERE captain.team_id = ${hackathonTeamRequests.teamId} AND captain.user_id = ${input.captainId} AND captain.is_captain = 1)`;

/**
 * Accept a request to join the captain's team (B-TEAM-05), in one atomic batch (AGENTS.md §11).
 *
 * The member is added from the pending request only while the actor captains its team and
 * {@link mayTakeTeamPlace} holds for the member who asked, which counts the team in the same statement; the
 * request is then marked accepted, and the member's other pending requests in the hackathon are
 * cancelled, each only when the statement before it changed a row. Returns whether they joined.
 */
export const acceptTeamRequest = async (
  db: Db,
  input: Answer,
): Promise<boolean> => {
  const [inserted] = await batch(db, [
    db.insert(hackathonTeamMembers).select(
      db
        .select({
          teamId: hackathonTeams.id,
          eventId: hackathonTeams.eventId,
          userId: hackathonTeamRequests.userId,
          isCaptain: sql<number>`0`.as('is_captain'),
          joinedAt: sql`unixepoch()`.as('joined_at'),
        })
        .from(hackathonTeamRequests)
        .innerJoin(
          hackathonTeams,
          eq(hackathonTeams.id, hackathonTeamRequests.teamId),
        )
        .innerJoin(hackathons, eq(hackathons.eventId, hackathonTeams.eventId))
        .innerJoin(events, eq(events.id, hackathonTeams.eventId))
        .where(
          and(
            pendingForCaptain(input),
            mayTakeTeamPlace(hackathonTeamRequests.userId),
          ),
        ),
    ),
    db
      .update(hackathonTeamRequests)
      .set({ status: 'accepted', decidedAt: new Date() })
      .where(and(pendingForCaptain(input), sql`changes() = 1`)),
    db
      .update(hackathonTeamRequests)
      .set({ status: 'cancelled', decidedAt: new Date() })
      .where(
        and(
          eq(hackathonTeamRequests.eventId, input.eventId),
          sql`${hackathonTeamRequests.userId} = (SELECT ${hackathonTeamRequests.userId} FROM ${hackathonTeamRequests} WHERE ${hackathonTeamRequests.id} = ${input.requestId})`,
          ne(hackathonTeamRequests.id, input.requestId),
          eq(hackathonTeamRequests.status, 'pending'),
          sql`changes() = 1`,
        ),
      ),
  ]);
  return isChanged(inserted);
};

/** Decline a pending request to join the captain's team (B-TEAM-05). Returns whether it was. */
export const declineTeamRequest = async (
  db: Db,
  input: Answer,
): Promise<boolean> =>
  isChanged(
    await db
      .update(hackathonTeamRequests)
      .set({ status: 'declined', decidedAt: new Date() })
      .where(pendingForCaptain(input)),
  );

/** Take back the member's own pending request (B-TEAM-05). Returns whether it was. */
export const cancelTeamRequest = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly requestId: string;
    readonly userId: string;
  },
): Promise<boolean> =>
  isChanged(
    await db
      .update(hackathonTeamRequests)
      .set({ status: 'cancelled', decidedAt: new Date() })
      .where(
        and(
          eq(hackathonTeamRequests.id, input.requestId),
          eq(hackathonTeamRequests.eventId, input.eventId),
          eq(hackathonTeamRequests.userId, input.userId),
          eq(hackathonTeamRequests.status, 'pending'),
        ),
      ),
  );
