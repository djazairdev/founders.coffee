import { and, asc, eq, gt } from 'drizzle-orm';

import type { Db } from './db.js';
import { events, hackathons } from './schema.js';

/**
 * A market's published hackathons that have not finished judging, soonest kickoff first, for its
 * landing page (B-HKN-20). Each comes with its dates, from which the page works out its phase.
 */
export const listUpcomingMarketHackathons = (
  db: Db,
  input: { marketCode: string; now: Date; limit: number },
) =>
  db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      kind: events.kind,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      registrationOpensAt: hackathons.registrationOpensAt,
      registrationClosesAt: hackathons.registrationClosesAt,
      submissionDeadlineAt: hackathons.submissionDeadlineAt,
      judgingEndsAt: hackathons.judgingEndsAt,
    })
    .from(hackathons)
    .innerJoin(events, eq(events.id, hackathons.eventId))
    .where(
      and(
        eq(events.marketCode, input.marketCode),
        eq(events.kind, 'hackathon'),
        eq(events.status, 'published'),
        gt(hackathons.judgingEndsAt, input.now),
      ),
    )
    .orderBy(asc(events.startsAt), asc(events.id))
    .limit(input.limit);
