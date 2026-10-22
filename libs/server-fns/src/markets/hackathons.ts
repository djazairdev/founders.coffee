import {
  listUpcomingMarketHackathons,
  type Db,
  type Market,
} from '@founders-coffee/db';

import {
  hackathonScheduleOf,
  type HackathonSchedule,
} from '../events/hackathon-schedule.js';

const MARKET_HACKATHONS_LIMIT = 6;

export type MarketHackathon = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly schedule: HackathonSchedule;
};

/**
 * The hackathons a market's landing page lists (B-HKN-20), each with its phase decided here so the
 * server and the browser render the same one. None, and no read, where the market has hackathons
 * off.
 */
export const resolveMarketHackathons = async (
  db: Db,
  market: Market,
  now: number = Date.now(),
): Promise<MarketHackathon[]> => {
  if (!market.featureFlags.hackathons) return [];
  const rows = await listUpcomingMarketHackathons(db, {
    marketCode: market.code,
    now: new Date(now),
    limit: MARKET_HACKATHONS_LIMIT,
  });
  return rows.flatMap((row) => {
    const schedule = hackathonScheduleOf(row, row, now);
    return schedule
      ? [{ id: row.id, slug: row.slug, title: row.title, schedule }]
      : [];
  });
};
