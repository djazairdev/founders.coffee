import { roleAllows } from '@founders-coffee/auth';
import { communityHealthQuerySchema } from '@founders-coffee/core';
import {
  communityOperationsEnabled,
  createDb,
  getUser,
  readCommunityHealthCounts,
} from '@founders-coffee/db';
import { operations } from '@founders-coffee/domain';
const {
  ratio,
  HOST_RETENTION_WINDOW_DAYS,
  RECURRING_HOST_WINDOW_DAYS,
  RECURRING_HOST_MIN_EVENTS,
  REPEAT_PARTICIPATION_WINDOW_DAYS,
} = operations;

export const COMMUNITY_HEALTH_PATH = '/api/community-health';
const answer = (data: unknown, status = 200): Response =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });

/** Export aggregates only after the admin Worker verifies Access and the correlated operator session. */
export const handleCommunityHealthRequest = async (
  request: Request,
  database: D1Database,
  verifiedRole: string,
): Promise<Response> => {
  if (!roleAllows(verifiedRole, { metrics: ['read'] }))
    return answer({ error: 'forbidden' }, 403);
  if (request.method !== 'GET')
    return answer({ error: 'method_not_allowed' }, 405);
  const parsed = communityHealthQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return answer({ error: 'invalid_reporting_window' }, 400);
  const query = parsed.data;
  if (query.market !== 'DZ')
    return answer({ error: 'market_not_supported' }, 400);
  const scope = {
    market: query.market,
    city: query.city,
    from: query.from,
    to: query.to,
    asOf: query.asOf,
  };
  const db = createDb(database);
  if (query.operatorHostId && !(await getUser(db, query.operatorHostId)))
    return answer({ error: 'unknown_operator_host' }, 400);
  if (!(await communityOperationsEnabled(db, query.market)))
    return answer({
      available: false,
      reason: 'community_operations_disabled',
      scope,
    });
  const counts = await readCommunityHealthCounts(db, query, {
    retentionDays: HOST_RETENTION_WINDOW_DAYS,
    recurringDays: RECURRING_HOST_WINDOW_DAYS,
    repeatDays: REPEAT_PARTICIPATION_WINDOW_DAYS,
    minimumEvents: RECURRING_HOST_MIN_EVENTS,
  });
  return answer({
    available: true,
    scope,
    counts,
    hostRetention30d: ratio(counts.retainedHosts30d, counts.eligibleHosts30d),
    attendeeRetention30d: ratio(
      counts.retainedAttendees30d,
      counts.eligibleAttendees30d,
    ),
    hostRetention60d: ratio(counts.retainedHosts, counts.eligibleHosts),
    repeatParticipation90d: ratio(
      counts.repeatingAttendees,
      counts.identifiedAttendees,
    ),
    closeoutCoverage: ratio(counts.closedOut, counts.ended),
    historyDays: 730,
    operatorExcluded: query.operatorHostId !== undefined,
  });
};
