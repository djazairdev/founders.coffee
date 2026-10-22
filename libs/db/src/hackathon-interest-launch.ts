import { and, asc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';

import type { Locale } from '@founders-coffee/core';

import type { Db } from './db.js';
import {
  hackathonInterest,
  hackathonInterestLaunches,
  hackathons,
  type HackathonInterestLaunchRow,
} from './schema.js';

export type ClaimedInterest = {
  readonly id: string;
  readonly email: string;
  readonly locale: Locale;
  readonly sendAttempts: number;
};

const changed = (result: { meta?: { changes?: number } }): boolean =>
  (result.meta?.changes ?? 0) > 0;

/**
 * Owe a market's interest list its registration notice, for a hackathon just approved (B-ANN-05).
 *
 * Written whether or not anyone waits yet, since the list stays open until registration opens. The
 * partial unique index on the market keeps one live or completed round per market, so a second
 * hackathon approved there writes nothing: only the first one's opening is announced. A pending
 * round whose hackathon is no longer published is withdrawn first, in the same batch, so a
 * hackathon cancelled before it opened does not keep the list from the next one.
 */
export const openHackathonInterestLaunch = async (
  db: Db,
  input: { id: string; eventId: string; marketCode: string; now: Date },
): Promise<{ written: boolean }> => {
  const [, result] = await db.batch([
    db
      .update(hackathonInterestLaunches)
      .set({ status: 'cancelled', cancelledAt: input.now })
      .where(
        and(
          eq(hackathonInterestLaunches.marketCode, input.marketCode),
          eq(hackathonInterestLaunches.status, 'pending'),
          sql`NOT EXISTS (
            SELECT 1 FROM events
            WHERE events.id = ${hackathonInterestLaunches.eventId}
              AND events.status = 'published'
          )`,
        ),
      ),
    db
      .insert(hackathonInterestLaunches)
      .values({ ...input, status: 'pending', createdAt: input.now })
      .onConflictDoNothing(),
  ]);
  return { written: changed(result) };
};

/**
 * Read one round by its id.
 */
export const getHackathonInterestLaunch = async (
  db: Db,
  launchId: string,
): Promise<HackathonInterestLaunchRow | undefined> => {
  const rows = await db
    .select()
    .from(hackathonInterestLaunches)
    .where(eq(hackathonInterestLaunches.id, launchId))
    .limit(1);
  return rows[0];
};

/**
 * The pending rounds whose hackathon has opened registration, oldest first, for the recovery
 * sweep. It reads through the pending index, which holds at most one row per market.
 */
export const listDueHackathonInterestLaunches = async (
  db: Db,
  input: { now: Date; limit: number },
): Promise<HackathonInterestLaunchRow[]> => {
  const rows = await db
    .select({ launch: hackathonInterestLaunches })
    .from(hackathonInterestLaunches)
    .innerJoin(
      hackathons,
      eq(hackathons.eventId, hackathonInterestLaunches.eventId),
    )
    .where(
      and(
        eq(hackathonInterestLaunches.status, 'pending'),
        lte(hackathons.registrationOpensAt, input.now),
      ),
    )
    .orderBy(asc(hackathonInterestLaunches.createdAt))
    .limit(input.limit);
  return rows.map((row) => row.launch);
};

/**
 * Take up to `limit` addresses of a market still waiting for the notice, oldest first.
 *
 * One statement marks them notified and returns them, so two passes running at once take disjoint
 * addresses and none is sent twice. The mark comes before the send: a pass that dies between the
 * two loses those notices rather than repeating them.
 */
export const claimHackathonInterest = async (
  db: Db,
  input: { marketCode: string; now: Date; limit: number },
): Promise<ClaimedInterest[]> =>
  db
    .update(hackathonInterest)
    .set({
      notifiedAt: input.now,
      sendAttempts: sql`${hackathonInterest.sendAttempts} + 1`,
    })
    .where(
      and(
        isNull(hackathonInterest.notifiedAt),
        inArray(
          hackathonInterest.id,
          db
            .select({ id: hackathonInterest.id })
            .from(hackathonInterest)
            .where(
              and(
                eq(hackathonInterest.marketCode, input.marketCode),
                isNull(hackathonInterest.notifiedAt),
              ),
            )
            .orderBy(asc(hackathonInterest.createdAt))
            .limit(input.limit),
        ),
      ),
    )
    .returning({
      id: hackathonInterest.id,
      email: hackathonInterest.email,
      locale: hackathonInterest.locale,
      sendAttempts: hackathonInterest.sendAttempts,
    });

/**
 * Record a notice that failed. Unless the address is given up on, it goes back to waiting, for a
 * later pass to try again; given up on, it keeps its mark, so retention still deletes it in time.
 */
export const releaseHackathonInterest = async (
  db: Db,
  input: { id: string; error: string; isFinal: boolean },
): Promise<void> => {
  await db
    .update(hackathonInterest)
    .set(
      input.isFinal
        ? { lastError: input.error }
        : { lastError: input.error, notifiedAt: null },
    )
    .where(eq(hackathonInterest.id, input.id));
};

/**
 * Mark a round completed once nobody in its market is still waiting for the notice.
 */
export const completeHackathonInterestLaunchIfDrained = async (
  db: Db,
  launch: { id: string; marketCode: string },
  now: Date,
): Promise<boolean> =>
  changed(
    await db
      .update(hackathonInterestLaunches)
      .set({ status: 'completed', completedAt: now })
      .where(
        and(
          eq(hackathonInterestLaunches.id, launch.id),
          eq(hackathonInterestLaunches.status, 'pending'),
          sql`NOT EXISTS (
            SELECT 1 FROM hackathon_interest
            WHERE market_code = ${launch.marketCode} AND notified_at IS NULL
          )`,
        ),
      ),
  );

/**
 * Withdraw a pending round whose hackathon will not take registrations, which leaves the market's
 * list owed to the next hackathon there.
 */
export const cancelHackathonInterestLaunch = async (
  db: Db,
  launchId: string,
  now: Date,
): Promise<void> => {
  await db
    .update(hackathonInterestLaunches)
    .set({ status: 'cancelled', cancelledAt: now })
    .where(
      and(
        eq(hackathonInterestLaunches.id, launchId),
        eq(hackathonInterestLaunches.status, 'pending'),
      ),
    );
};
