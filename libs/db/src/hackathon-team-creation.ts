import { and, eq, sql, type SQL } from 'drizzle-orm';

import { batch } from './atomic.js';
import type { Db } from './db.js';
import { bound } from './insert-select.js';
import {
  events,
  hackathonRegistrations,
  hackathons,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
} from './schema.js';

export type NewTeam = {
  readonly id: string;
  readonly eventId: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isLookingForMembers: boolean;
};

export type TeamCreation =
  | { readonly outcome: 'created' }
  | { readonly outcome: 'name_taken' }
  | { readonly outcome: 'not_created' };

/**
 * Whether the member may still start a team: they hold a place in the published hackathon, its
 * submission deadline is ahead, and they are in no team yet.
 */
const mayCreate = (team: NewTeam): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathonRegistrations} JOIN ${events} ON ${events.id} = ${hackathonRegistrations.eventId} WHERE ${hackathonRegistrations.eventId} = ${team.eventId} AND ${hackathonRegistrations.userId} = ${team.userId} AND ${hackathonRegistrations.status} = 'registered' AND ${events.status} = 'published') AND ${hackathons.submissionDeadlineAt} > unixepoch() AND NOT EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.eventId} = ${team.eventId} AND ${hackathonTeamMembers.userId} = ${team.userId})`;

/** Whether another team of the hackathon already goes by the name, whatever its case. */
const nameTaken = (team: Pick<NewTeam, 'eventId' | 'name'>): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathonTeams} WHERE ${hackathonTeams.eventId} = ${team.eventId} AND lower(${hackathonTeams.name}) = lower(${team.name}))`;

const teamWritten = (teamId: string): SQL =>
  sql`EXISTS (SELECT 1 FROM ${hackathonTeams} WHERE ${hackathonTeams.id} = ${teamId})`;

/**
 * Start a team with its creator as captain, in one atomic batch (B-TEAM-03, AGENTS.md §11).
 *
 * The team is selected from the hackathon's own row only while {@link mayCreate} holds and no other
 * team has the name; the captain's membership follows only when the team was written, and their
 * pending requests to join other teams are cancelled, since a member is in one team. D1 runs a batch
 * alone, so two members asking for the same name at once get it once. When nothing was written,
 * a taken name is told apart from every other reason.
 */
export const createHackathonTeam = async (
  db: Db,
  team: NewTeam,
): Promise<TeamCreation> => {
  const written = teamWritten(team.id);
  const [inserted] = await batch(db, [
    db.insert(hackathonTeams).select(
      db
        .select({
          id: bound(team.id, 'id'),
          eventId: hackathons.eventId,
          name: bound(team.name, 'name'),
          description: bound(team.description, 'description'),
          isLookingForMembers: bound(
            team.isLookingForMembers ? 1 : 0,
            'looking_for_members',
          ),
          createdAt: sql`unixepoch()`.as('created_at'),
          updatedAt: sql`unixepoch()`.as('updated_at'),
        })
        .from(hackathons)
        .where(
          and(
            eq(hackathons.eventId, team.eventId),
            mayCreate(team),
            sql`NOT ${nameTaken(team)}`,
          ),
        ),
    ),
    db.insert(hackathonTeamMembers).select(
      db
        .select({
          teamId: hackathonTeams.id,
          eventId: hackathonTeams.eventId,
          userId: bound(team.userId, 'user_id'),
          isCaptain: sql<number>`1`.as('is_captain'),
          joinedAt: sql`unixepoch()`.as('joined_at'),
        })
        .from(hackathonTeams)
        .where(eq(hackathonTeams.id, team.id)),
    ),
    db
      .update(hackathonTeamRequests)
      .set({ status: 'cancelled', decidedAt: new Date() })
      .where(
        and(
          eq(hackathonTeamRequests.eventId, team.eventId),
          eq(hackathonTeamRequests.userId, team.userId),
          eq(hackathonTeamRequests.status, 'pending'),
          written,
        ),
      ),
  ]);
  if (((inserted as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0)
    return { outcome: 'created' };
  const [taken] = await db
    .select({ isTaken: sql<number>`${nameTaken(team)}` })
    .from(hackathons)
    .where(eq(hackathons.eventId, team.eventId));
  return taken?.isTaken
    ? { outcome: 'name_taken' }
    : { outcome: 'not_created' };
};
