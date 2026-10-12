import { sql } from 'drizzle-orm';
import type { CommunityHealthQuery } from '@founders-coffee/core';
import type { Db } from './db.js';

export interface CommunityHealthCounts {
  completed: number;
  independentCompleted: number;
  periodUniqueAttendees: number;
  firstTimeAttendees: number;
  firstTimeHosts: number;
  pendingHosts30d: number;
  pendingAttendees30d: number;
  activeHosts: number;
  recurringHosts: number;
  eligibleHosts: number;
  eligibleHosts30d: number;
  retainedHosts30d: number;
  eligibleAttendees30d: number;
  retainedAttendees30d: number;
  retainedHosts: number;
  identifiedAttendees: number;
  repeatingAttendees: number;
  returningAttendees: number;
  walkIns: number;
  ended: number;
  closedOut: number;
}

/** Aggregate recorded outcomes in D1; member identities never leave the query. */
export const readCommunityHealthCounts = async (
  db: Db,
  query: CommunityHealthQuery,
  windows: {
    retentionDays: number;
    recurringDays: number;
    repeatDays: number;
    minimumEvents: number;
  },
): Promise<CommunityHealthCounts> => {
  const seconds = (date: string) => Math.floor(Date.parse(date) / 1000);
  const from = seconds(query.from),
    to = seconds(query.to),
    asOf = seconds(query.asOf);
  const retention = windows.retentionDays * 86400;
  const historyFrom = asOf - 730 * 86400;
  const city = query.city ? sql`AND e.city_code = ${query.city}` : sql``;
  const operator = query.operatorHostId
    ? sql`WHERE host_id != ${query.operatorHostId}`
    : sql``;
  const rows = await db.all<CommunityHealthCounts>(sql`
    WITH ended_events AS (
      SELECT e.id, e.host_id, e.ends_at, c.outcome, c.walk_in_count,
        CASE WHEN c.submitted_at <= ${asOf} THEN 1 ELSE 0 END AS reported
      FROM events e LEFT JOIN event_closeouts c ON c.event_id = e.id
      WHERE e.market_code = ${query.market} ${city} AND e.status = 'published'
        AND e.ends_at >= ${historyFrom} AND e.ends_at <= ${asOf}
    ), held AS (
      SELECT * FROM ended_events e WHERE e.reported = 1 AND e.outcome = 'held'
        AND (e.walk_in_count > 0 OR EXISTS (
          SELECT 1 FROM event_attendance a WHERE a.event_id = e.id
            AND a.user_id != e.host_id AND a.outcome = 'attended'
            AND a.recorded_at <= ${asOf}
        ))
    ), participants AS (
      SELECT DISTINCT a.user_id, h.id, h.ends_at FROM held h
      JOIN event_attendance a ON a.event_id = h.id
      WHERE a.user_id != h.host_id AND a.outcome = 'attended' AND a.recorded_at <= ${asOf}
    ), independent AS (SELECT * FROM held ${operator}), host_first AS (
      SELECT host_id, MIN(ends_at) AS first_at FROM independent GROUP BY host_id
    ), eligible AS (
      SELECT * FROM host_first WHERE first_at <= ${asOf - retention}
    ), host_cohort30 AS (
      SELECT * FROM host_first WHERE first_at >= ${from} AND first_at < ${to} AND first_at <= ${asOf - 30 * 86400}
    ), attendee_first AS (
      SELECT user_id, MIN(ends_at) AS first_at FROM participants GROUP BY user_id
    ), attendee_cohort30 AS (
      SELECT * FROM attendee_first WHERE first_at >= ${from} AND first_at < ${to} AND first_at <= ${asOf - 30 * 86400}
    ), active AS (
      SELECT user_id, COUNT(*) AS visits FROM participants
      WHERE ends_at >= ${asOf - windows.repeatDays * 86400} GROUP BY user_id
    ) SELECT
      (SELECT COUNT(*) FROM held WHERE ends_at >= ${from} AND ends_at < ${to}) AS completed,
      (SELECT COUNT(*) FROM independent WHERE ends_at >= ${from} AND ends_at < ${to}) AS independentCompleted,
      (SELECT COUNT(DISTINCT user_id) FROM participants WHERE ends_at >= ${from} AND ends_at < ${to}) AS periodUniqueAttendees,
      (SELECT COUNT(*) FROM host_first WHERE first_at >= ${from} AND first_at < ${to}) AS firstTimeHosts,
      (SELECT COUNT(*) FROM attendee_first WHERE first_at >= ${from} AND first_at < ${to}) AS firstTimeAttendees,
      (SELECT COUNT(*) FROM host_first WHERE first_at >= ${from} AND first_at < ${to} AND first_at > ${asOf - 30 * 86400}) AS pendingHosts30d,
      (SELECT COUNT(*) FROM attendee_first WHERE first_at >= ${from} AND first_at < ${to} AND first_at > ${asOf - 30 * 86400}) AS pendingAttendees30d,
      (SELECT COUNT(DISTINCT host_id) FROM independent WHERE ends_at >= ${from} AND ends_at < ${to}) AS activeHosts,
      (SELECT COUNT(*) FROM (SELECT host_id FROM independent
        WHERE ends_at >= ${asOf - windows.recurringDays * 86400}
        GROUP BY host_id HAVING COUNT(DISTINCT date(ends_at, 'unixepoch', '+1 hour')) >= ${windows.minimumEvents})) AS recurringHosts,
      (SELECT COUNT(*) FROM host_cohort30) AS eligibleHosts30d,
      (SELECT COUNT(*) FROM host_cohort30 f WHERE EXISTS (SELECT 1 FROM independent h
        WHERE h.host_id = f.host_id AND h.ends_at <= f.first_at + ${30 * 86400}
          AND date(h.ends_at, 'unixepoch', '+1 hour') > date(f.first_at, 'unixepoch', '+1 hour'))) AS retainedHosts30d,
      (SELECT COUNT(*) FROM attendee_cohort30) AS eligibleAttendees30d,
      (SELECT COUNT(*) FROM attendee_cohort30 f WHERE EXISTS (SELECT 1 FROM participants p
        WHERE p.user_id = f.user_id AND p.ends_at <= f.first_at + ${30 * 86400}
          AND date(p.ends_at, 'unixepoch', '+1 hour') > date(f.first_at, 'unixepoch', '+1 hour'))) AS retainedAttendees30d,
      (SELECT COUNT(*) FROM eligible) AS eligibleHosts,
      (SELECT COUNT(*) FROM eligible f WHERE EXISTS (SELECT 1 FROM held h
        WHERE h.host_id = f.host_id AND h.ends_at > f.first_at
          AND h.ends_at <= f.first_at + ${retention})) AS retainedHosts,
      (SELECT COUNT(*) FROM active) AS identifiedAttendees,
      (SELECT COUNT(*) FROM active WHERE visits >= ${windows.minimumEvents}) AS repeatingAttendees,
      (SELECT COUNT(DISTINCT p.user_id) FROM participants p
        WHERE p.ends_at >= ${from} AND p.ends_at < ${to} AND EXISTS (
          SELECT 1 FROM participants earlier WHERE earlier.user_id = p.user_id AND earlier.ends_at >= p.ends_at - ${windows.repeatDays * 86400} AND date(earlier.ends_at, 'unixepoch', '+1 hour') < date(p.ends_at, 'unixepoch', '+1 hour')
        )) AS returningAttendees,
      COALESCE((SELECT SUM(walk_in_count) FROM held WHERE ends_at >= ${from} AND ends_at < ${to}), 0) AS walkIns,
      (SELECT COUNT(*) FROM ended_events WHERE ends_at >= ${from} AND ends_at < ${to}) AS ended,
      (SELECT COUNT(*) FROM ended_events WHERE ends_at >= ${from} AND ends_at < ${to} AND reported = 1) AS closedOut
  `);
  return rows[0];
};
