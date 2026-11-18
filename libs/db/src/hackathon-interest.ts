import { and, inArray, isNotNull, lt } from 'drizzle-orm';

import type { Locale } from '@founders-coffee/core';

import type { Db } from './db.js';
import { hackathonInterest } from './schema.js';

const INTEREST_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Put an address on a market's hackathon interest list, once.
 *
 * UNIQUE(email, market_code) is the insert's own conflict target, so a repeat changes nothing.
 * Whether the row is new is returned for the metric alone: the caller answers the form the same
 * way either time, so the form never says who is already on the list.
 */
export const insertHackathonInterest = async (
  db: Db,
  entry: { id: string; email: string; marketCode: string; locale: Locale },
): Promise<{ isNew: boolean }> => {
  const result = await db
    .insert(hackathonInterest)
    .values(entry)
    .onConflictDoNothing({
      target: [hackathonInterest.email, hackathonInterest.marketCode],
    });
  return { isNew: ((result.meta?.changes ?? 0) as number) > 0 };
};

/**
 * Delete up to `limit` interest entries whose notice went out more than twelve months ago.
 *
 * An address is kept until the registration notice is sent, then twelve months, the retention
 * B-ANN-04 states in the privacy policy; an entry never notified is still waiting and stays. It reads only through the partial index on
 * `notified_at`, the bounded daily sweep AGENTS.md §11.5 allows for retention (#106).
 */
export const deleteExpiredHackathonInterest = async (
  db: Db,
  input: { now: Date; limit: number },
): Promise<number> => {
  const cutoff = new Date(input.now.getTime() - INTEREST_RETENTION_MS);
  const result = await db.delete(hackathonInterest).where(
    inArray(
      hackathonInterest.id,
      db
        .select({ id: hackathonInterest.id })
        .from(hackathonInterest)
        .where(
          and(
            isNotNull(hackathonInterest.notifiedAt),
            lt(hackathonInterest.notifiedAt, cutoff),
          ),
        )
        .limit(input.limit),
    ),
  );
  return (result.meta?.changes ?? 0) as number;
};
