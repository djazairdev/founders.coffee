import { and, eq, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  events,
  hackathonResults,
  hackathons,
  hackathonTeamMembers,
} from './schema.js';

const FOURTEEN_DAYS = 14 * 24 * 60 * 60;

/**
 * The hackathon half of the feedback window (B-OPS-03), for the same conditional insert as a
 * meetup's. A hackathon has no closeout or attendance, so a member of a team still in the frozen
 * results may answer, for fourteen days from the results rather than from the end, since judging can
 * run past that. Its creator is refused for the same reason a host is.
 */
export const hackathonFeedbackAllowed = (eventId: string, userId: string) =>
  sql`events.id = ${eventId}
      AND events.kind = 'hackathon'
      AND events.host_id <> ${userId}
      AND EXISTS (
        SELECT 1 FROM hackathons
        WHERE hackathons.event_id = ${eventId}
          AND hackathons.results_published_at IS NOT NULL
          AND unixepoch() - hackathons.results_published_at <= ${FOURTEEN_DAYS})
      AND EXISTS (
        SELECT 1 FROM hackathon_team_members
        INNER JOIN hackathon_results ON hackathon_results.team_id = hackathon_team_members.team_id
        WHERE hackathon_team_members.event_id = ${eventId}
          AND hackathon_team_members.user_id = ${userId}
          AND hackathon_results.disqualified_at IS NULL)`;

/**
 * Where a member stands for a hackathon's feedback (B-OPS-03), or `null` when the event is not a
 * hackathon, whose rules are the meetup's instead.
 */
export const hackathonFeedbackStanding = async (
  db: Db,
  opts: { eventId: string; userId: string; now?: Date },
): Promise<
  'ready' | 'window_closed' | 'not_attended' | 'not_invited' | null
> => {
  const [hackathon] = await db
    .select({ publishedAt: hackathons.resultsPublishedAt })
    .from(hackathons)
    .innerJoin(events, eq(events.id, hackathons.eventId))
    .where(
      and(eq(hackathons.eventId, opts.eventId), eq(events.kind, 'hackathon')),
    )
    .limit(1);
  if (!hackathon) return null;
  if (!hackathon.publishedAt) return 'not_invited';
  const [entry] = await db
    .select({ teamId: hackathonTeamMembers.teamId })
    .from(hackathonTeamMembers)
    .innerJoin(
      hackathonResults,
      eq(hackathonResults.teamId, hackathonTeamMembers.teamId),
    )
    .where(
      and(
        eq(hackathonTeamMembers.eventId, opts.eventId),
        eq(hackathonTeamMembers.userId, opts.userId),
        sql`${hackathonResults.disqualifiedAt} IS NULL`,
      ),
    )
    .limit(1);
  if (!entry) return 'not_attended';
  const elapsed =
    (opts.now ?? new Date()).getTime() - hackathon.publishedAt.getTime();
  return elapsed <= FOURTEEN_DAYS * 1000 ? 'ready' : 'window_closed';
};
