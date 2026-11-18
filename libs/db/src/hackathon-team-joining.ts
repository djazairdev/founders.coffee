import { sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import {
  events,
  hackathonRegistrations,
  hackathons,
  hackathonTeamMembers,
  hackathonTeams,
} from './schema.js';

/**
 * Whether `userId` may take a place in the team selected beside {@link hackathonTeams}, with its
 * hackathon and event joined (B-TEAM-04, B-TEAM-05): the hackathon is published and its submission
 * deadline ahead, the member holds a place and is in no team yet, and the team has room. Counting
 * the team in the statement that adds the member is what keeps two members from both taking its
 * last place.
 */
export const mayTakeTeamPlace = (userId: string | SQLiteColumn): SQL =>
  sql`${events.status} = 'published' AND ${hackathons.submissionDeadlineAt} > unixepoch() AND EXISTS (SELECT 1 FROM ${hackathonRegistrations} WHERE ${hackathonRegistrations.eventId} = ${hackathonTeams.eventId} AND ${hackathonRegistrations.userId} = ${userId} AND ${hackathonRegistrations.status} = 'registered') AND NOT EXISTS (SELECT 1 FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.eventId} = ${hackathonTeams.eventId} AND ${hackathonTeamMembers.userId} = ${userId}) AND (SELECT count(*) FROM ${hackathonTeamMembers} WHERE ${hackathonTeamMembers.teamId} = ${hackathonTeams.id}) < ${hackathons.teamMax}`;
