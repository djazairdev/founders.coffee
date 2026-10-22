import { and, eq, gt, inArray, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';

import type { Db } from './db.js';
import {
  hackathonRegistrations,
  hackathons,
  hackathonTeamMembers,
  hackathonTeamRequests,
  hackathonTeams,
} from './schema.js';

/**
 * The statements that take a closing member out of every hackathon, in the order the erasure batch
 * runs them, each re-checking `stillClosing`.
 *
 * Their requests to join teams and their team places go first. A team they captained passes to the
 * member who joined it earliest after them, and a team left with nobody is deleted, so no team is
 * left without a captain; both are looked for only in the hackathons they were registered for, and
 * a team never stays empty otherwise (B-TEAM-06). Then their registrations go, and the places the
 * registered ones held go back to their hackathons. Invite links they made stay with their teams.
 */
export const hackathonErasure = (
  db: Db,
  userId: string,
  stillClosing: SQL,
): BatchItem<'sqlite'>[] => {
  const theirHackathons = db
    .select({ eventId: hackathonRegistrations.eventId })
    .from(hackathonRegistrations)
    .where(eq(hackathonRegistrations.userId, userId));
  return [
    db
      .delete(hackathonTeamRequests)
      .where(and(eq(hackathonTeamRequests.userId, userId), stillClosing)),
    db
      .delete(hackathonTeamMembers)
      .where(and(eq(hackathonTeamMembers.userId, userId), stillClosing)),
    db
      .update(hackathonTeamMembers)
      .set({ isCaptain: true })
      .where(
        and(
          inArray(hackathonTeamMembers.eventId, theirHackathons),
          sql`not exists (select 1 from ${hackathonTeamMembers} captain where captain.team_id = ${hackathonTeamMembers.teamId} and captain.is_captain = 1)`,
          sql`${hackathonTeamMembers.userId} = (select earliest.user_id from ${hackathonTeamMembers} earliest where earliest.team_id = ${hackathonTeamMembers.teamId} order by earliest.joined_at, earliest.user_id limit 1)`,
          stillClosing,
        ),
      ),
    db
      .delete(hackathonTeams)
      .where(
        and(
          inArray(hackathonTeams.eventId, theirHackathons),
          sql`not exists (select 1 from ${hackathonTeamMembers} where ${hackathonTeamMembers.teamId} = ${hackathonTeams.id})`,
          stillClosing,
        ),
      ),
    db
      .update(hackathons)
      .set({ registeredCount: sql`${hackathons.registeredCount} - 1` })
      .where(
        and(
          inArray(
            hackathons.eventId,
            db
              .select({ eventId: hackathonRegistrations.eventId })
              .from(hackathonRegistrations)
              .where(
                and(
                  eq(hackathonRegistrations.userId, userId),
                  eq(hackathonRegistrations.status, 'registered'),
                ),
              ),
          ),
          gt(hackathons.registeredCount, 0),
          stillClosing,
        ),
      ),
    db
      .delete(hackathonRegistrations)
      .where(and(eq(hackathonRegistrations.userId, userId), stillClosing)),
  ];
};
