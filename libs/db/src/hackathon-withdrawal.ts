import { and, eq, sql, type SQL } from 'drizzle-orm';

import type { HackathonRegistrationStatus } from '@founders-coffee/core';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import {
  events,
  hackathonRegistrations,
  hackathons,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
} from './schema.js';

export type Withdrawal =
  | { readonly outcome: 'withdrawn'; readonly promotedUserId: string | null }
  | { readonly outcome: 'not_withdrawn' };

type Participant = { readonly eventId: string; readonly userId: string };

export type WithdrawalState = {
  readonly status: HackathonRegistrationStatus | null;
  readonly membership: {
    readonly teamId: string;
    readonly isCaptain: boolean;
  } | null;
  readonly teamSize: number;
};

/**
 * Where a member stands before withdrawing (B-REG-04): their registration's status, the team they
 * are in and whether they captain it, and how many people are in it. One query.
 */
export const readWithdrawalState = async (
  db: Db,
  { eventId, userId }: Participant,
): Promise<WithdrawalState> => {
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

/**
 * Whether the member may still withdraw: they hold a place or wait for one, the hackathon is
 * published and its submission deadline is still ahead, and they do not captain a team with anyone
 * else in it, whose captaincy they hand on first. Every statement of the withdrawal carries it.
 */
const mayWithdraw = ({ eventId, userId }: Participant): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathonRegistrations} JOIN ${hackathons} ON ${hackathons.eventId} = ${hackathonRegistrations.eventId} JOIN ${events} ON ${events.id} = ${hackathonRegistrations.eventId} WHERE ${hackathonRegistrations.eventId} = ${eventId} AND ${hackathonRegistrations.userId} = ${userId} AND ${hackathonRegistrations.status} IN ('registered', 'waitlisted') AND ${events.status} = 'published' AND ${hackathons.submissionDeadlineAt} > unixepoch()) AND NOT EXISTS (SELECT 1 FROM ${hackathonTeamMembers} captain WHERE captain.event_id = ${eventId} AND captain.user_id = ${userId} AND captain.is_captain = 1 AND (SELECT count(*) FROM ${hackathonTeamMembers} other WHERE other.team_id = captain.team_id) > 1)`;

/** Whether the member holds a place, rather than waiting for one. */
const holdsPlace = ({ eventId, userId }: Participant): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathonRegistrations} WHERE ${hackathonRegistrations.eventId} = ${eventId} AND ${hackathonRegistrations.userId} = ${userId} AND ${hackathonRegistrations.status} = 'registered')`;

/**
 * Withdraw a member from a hackathon in one atomic batch (B-REG-04, AGENTS.md §11).
 *
 * The member leaves their team on the way out: their pending requests to join one are cancelled, a
 * team they were alone in goes, and their place in any other team is given up. When they held a
 * place, the earliest member on the waitlist takes it; only when nobody was waiting does the count
 * of places taken go down, which the statement after the promotion reads from `changes()`. Their
 * registration turns `withdrawn` last, so every statement before it sees the member as they were and
 * either the whole withdrawal lands or, when {@link mayWithdraw} no longer holds, none of it does.
 * Returns who was promoted, if anyone.
 */
export const withdrawHackathonRegistration = async (
  db: Db,
  participant: Participant,
): Promise<Withdrawal> => {
  const { eventId, userId } = participant;
  const allowed = mayWithdraw(participant);
  const results = await batch(db, [
    db
      .update(hackathonTeamRequests)
      .set({ status: 'cancelled', decidedAt: new Date() })
      .where(
        and(
          eq(hackathonTeamRequests.eventId, eventId),
          eq(hackathonTeamRequests.userId, userId),
          eq(hackathonTeamRequests.status, 'pending'),
          allowed,
        ),
      ),
    db
      .delete(hackathonTeams)
      .where(
        and(
          eq(hackathonTeams.eventId, eventId),
          sql`${hackathonTeams.id} IN (SELECT team_id FROM ${hackathonTeamMembers} WHERE event_id = ${eventId} AND user_id = ${userId})`,
          sql`(SELECT count(*) FROM ${hackathonTeamMembers} WHERE team_id = ${hackathonTeams.id}) = 1`,
          allowed,
        ),
      ),
    db
      .delete(hackathonTeamMembers)
      .where(
        and(
          eq(hackathonTeamMembers.eventId, eventId),
          eq(hackathonTeamMembers.userId, userId),
          allowed,
        ),
      ),
    db
      .update(hackathonRegistrations)
      .set({ status: 'registered', updatedAt: new Date() })
      .where(
        and(
          sql`${hackathonRegistrations.id} = (SELECT id FROM ${hackathonRegistrations} WHERE event_id = ${eventId} AND status = 'waitlisted' AND user_id != ${userId} ORDER BY created_at, rowid LIMIT 1)`,
          holdsPlace(participant),
          allowed,
        ),
      )
      .returning({ userId: hackathonRegistrations.userId }),
    db
      .update(hackathons)
      .set({ registeredCount: sql`${hackathons.registeredCount} - 1` })
      .where(
        and(
          eq(hackathons.eventId, eventId),
          sql`changes() = 0`,
          holdsPlace(participant),
          allowed,
        ),
      ),
    db
      .update(hackathonRegistrations)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(
        and(
          eq(hackathonRegistrations.eventId, eventId),
          eq(hackathonRegistrations.userId, userId),
          allowed,
        ),
      )
      .returning({ id: hackathonRegistrations.id }),
  ]);
  const promoted = results[3] as readonly { userId: string }[];
  const withdrawn = results[5] as readonly { id: string }[];
  if (withdrawn.length === 0) return { outcome: 'not_withdrawn' };
  return { outcome: 'withdrawn', promotedUserId: promoted[0]?.userId ?? null };
};
