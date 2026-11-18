import { eq, sql, type SQL } from 'drizzle-orm';

import type { Db } from './db.js';
import { markets } from './schema.js';

type MarketFlagName = 'communityOperations' | 'hackathons';

/**
 * Whether one feature flag is switched on for a market.
 *
 * Only a stored `true` counts. An absent key (a market row written before the flag existed, or a
 * JSON blob that lost it), a non-boolean value, and a market that does not exist all resolve to
 * off, because refusing is the only answer that cannot expose an unfinished surface.
 */
export const marketFlagEnabled = async (
  db: Db,
  marketCode: string,
  flag: MarketFlagName,
): Promise<boolean> => {
  const rows = await db
    .select({ flags: markets.featureFlags })
    .from(markets)
    .where(eq(markets.code, marketCode))
    .limit(1);
  return rows[0]?.flags?.[flag] === true;
};

/**
 * Whether hackathons are switched on for this market.
 *
 * Every Stage B server function checks it before reading or writing anything hackathon-shaped, so
 * the flag gates the server and not only what a screen happens to render. It ships off in every
 * market; B-LCH-06 turns it on in Algeria.
 */
export const hackathonsEnabled = (
  db: Db,
  marketCode: string,
): Promise<boolean> => marketFlagEnabled(db, marketCode, 'hackathons');

/**
 * Whether any market has switched hackathons on, as one SQL expression.
 *
 * An account belongs to no market, so a setting that only matters once some market runs hackathons
 * (the Hackathons row in the notification preferences) asks this rather than a member's market.
 * The test is the same as {@link marketFlagEnabled}'s: a stored JSON `true`, nothing else.
 */
export const isHackathonsOnAnywhere = (): SQL =>
  sql`EXISTS (SELECT 1 FROM ${markets} WHERE json_type(${markets.featureFlags}, '$.hackathons') = 'true')`;
