import { and, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  events,
  hackathonRegistrations,
  hackathonTeamInvites,
  hackathonTeamRequests,
  hackathonTeams,
} from './schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const HACKATHON_TEAM_LINKS_KEPT_DAYS = 30;
export const HACKATHON_SKILLS_KEPT_DAYS = 365;

type Sweep = { readonly now: Date; readonly limit: number };

/** The hackathons that ended more than `days` ago, read through the partial index on their end. */
const endedBefore = (db: Db, now: Date, days: number) =>
  db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.kind, 'hackathon'),
        lt(events.endsAt, new Date(now.getTime() - days * DAY_MS)),
      ),
    );

/**
 * Delete up to `limit` invite links of hackathons that ended more than
 * {@link HACKATHON_TEAM_LINKS_KEPT_DAYS} days ago (B-SAFE-05), the bounded daily sweep AGENTS.md
 * §11.5 allows. Returns how many went.
 */
export const deleteExpiredHackathonTeamInvites = async (
  db: Db,
  input: Sweep,
): Promise<number> => {
  const deleted = await db
    .delete(hackathonTeamInvites)
    .where(
      inArray(
        hackathonTeamInvites.id,
        db
          .select({ id: hackathonTeamInvites.id })
          .from(hackathonTeamInvites)
          .where(
            inArray(
              hackathonTeamInvites.teamId,
              db
                .select({ id: hackathonTeams.id })
                .from(hackathonTeams)
                .where(
                  inArray(
                    hackathonTeams.eventId,
                    endedBefore(db, input.now, HACKATHON_TEAM_LINKS_KEPT_DAYS),
                  ),
                ),
            ),
          )
          .limit(input.limit),
      ),
    )
    .returning({ id: hackathonTeamInvites.id });
  return deleted.length;
};

/**
 * Delete up to `limit` requests to join a team, whatever their answer, of hackathons that ended more
 * than {@link HACKATHON_TEAM_LINKS_KEPT_DAYS} days ago (B-SAFE-05). Returns how many went.
 */
export const deleteExpiredHackathonTeamRequests = async (
  db: Db,
  input: Sweep,
): Promise<number> => {
  const deleted = await db
    .delete(hackathonTeamRequests)
    .where(
      inArray(
        hackathonTeamRequests.id,
        db
          .select({ id: hackathonTeamRequests.id })
          .from(hackathonTeamRequests)
          .where(
            inArray(
              hackathonTeamRequests.eventId,
              endedBefore(db, input.now, HACKATHON_TEAM_LINKS_KEPT_DAYS),
            ),
          )
          .limit(input.limit),
      ),
    )
    .returning({ id: hackathonTeamRequests.id });
  return deleted.length;
};

/**
 * Clear up to `limit` skills lines of hackathons that ended more than
 * {@link HACKATHON_SKILLS_KEPT_DAYS} days ago (B-SAFE-05), read through the partial index on the
 * lines still there. The registration stays: only the text a member wrote about themselves goes.
 * Returns how many were cleared.
 */
export const clearExpiredHackathonSkills = async (
  db: Db,
  input: Sweep,
): Promise<number> => {
  const cleared = await db
    .update(hackathonRegistrations)
    .set({ skills: null, updatedAt: sql`(unixepoch())` })
    .where(
      inArray(
        hackathonRegistrations.id,
        db
          .select({ id: hackathonRegistrations.id })
          .from(hackathonRegistrations)
          .where(
            and(
              isNotNull(hackathonRegistrations.skills),
              inArray(
                hackathonRegistrations.eventId,
                endedBefore(db, input.now, HACKATHON_SKILLS_KEPT_DAYS),
              ),
            ),
          )
          .limit(input.limit),
      ),
    )
    .returning({ id: hackathonRegistrations.id });
  return cleared.length;
};
