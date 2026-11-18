import { sql } from 'drizzle-orm';

import type { Db } from './db.js';
import {
  hackathonCertificates,
  hackathonJudges,
  hackathonRegistrations,
  hackathonResults,
  hackathonTeamMembers,
} from './schema.js';

/**
 * The next members to tell a hackathon's results are out (B-JDG-11), in a stable order to page by:
 * everyone holding a place and every judge who accepted, each once. A member whose team was given
 * scores also has feedback to read (B-JDG-12), and a member of a team still in the results gets the
 * follow-ups (B-OPS-03). Each comes with their strongest standing certificate, if any (B-CRT-03).
 */
export const listResultsNoticeRecipients = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly afterUserId: string | null;
    readonly limit: number;
  },
): Promise<
  readonly {
    readonly userId: string;
    readonly hasFeedback: boolean;
    readonly isOnEntry: boolean;
    readonly certificateCode: string | null;
  }[]
> => {
  const rows = await db.all<{
    userId: string;
    hasFeedback: number;
    isOnEntry: number;
    certificateCode: string | null;
  }>(sql`
    SELECT recipient.user_id AS userId, EXISTS (
      SELECT 1 FROM ${hackathonTeamMembers}
      INNER JOIN ${hackathonResults} ON ${hackathonResults.teamId} = ${hackathonTeamMembers.teamId}
      WHERE ${hackathonTeamMembers.eventId} = ${input.eventId}
        AND ${hackathonTeamMembers.userId} = recipient.user_id
        AND ${hackathonResults.total} IS NOT NULL
    ) AS hasFeedback, EXISTS (
      SELECT 1 FROM ${hackathonTeamMembers}
      INNER JOIN ${hackathonResults} ON ${hackathonResults.teamId} = ${hackathonTeamMembers.teamId}
      WHERE ${hackathonTeamMembers.eventId} = ${input.eventId}
        AND ${hackathonTeamMembers.userId} = recipient.user_id
        AND ${hackathonResults.disqualifiedAt} IS NULL
    ) AS isOnEntry, (
      SELECT ${hackathonCertificates.verificationCode} FROM ${hackathonCertificates}
      WHERE ${hackathonCertificates.eventId} = ${input.eventId}
        AND ${hackathonCertificates.userId} = recipient.user_id
        AND ${hackathonCertificates.revokedAt} IS NULL
      ORDER BY CASE ${hackathonCertificates.kind} WHEN 'winner' THEN 0 WHEN 'judge' THEN 1 ELSE 2 END
      LIMIT 1
    ) AS certificateCode FROM (
      SELECT ${hackathonRegistrations.userId} AS user_id FROM ${hackathonRegistrations}
      WHERE ${hackathonRegistrations.eventId} = ${input.eventId}
        AND ${hackathonRegistrations.status} = 'registered'
      UNION
      SELECT ${hackathonJudges.userId} AS user_id FROM ${hackathonJudges}
      WHERE ${hackathonJudges.eventId} = ${input.eventId}
        AND ${hackathonJudges.status} = 'accepted'
        AND ${hackathonJudges.userId} IS NOT NULL
    ) AS recipient
    WHERE recipient.user_id > ${input.afterUserId ?? ''}
    ORDER BY recipient.user_id
    LIMIT ${input.limit}
  `);
  return rows.map((row) => ({
    userId: row.userId,
    hasFeedback: row.hasFeedback === 1,
    isOnEntry: row.isOnEntry === 1,
    certificateCode: row.certificateCode,
  }));
};
