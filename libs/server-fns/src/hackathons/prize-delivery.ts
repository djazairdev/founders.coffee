import {
  AppError,
  err,
  ok,
  type HackathonPrizeDeliveryStatus,
  type Result,
} from '@founders-coffee/core';
import {
  assignPrize,
  listPrizeDeliveries,
  listPrizeEntries,
  setPrizeDelivery,
  type Db,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { loadPlaceHackathon } from './place-context.js';

export type PrizeDeliveryView = {
  readonly isOpen: boolean;
  readonly prizes: readonly {
    readonly prizeId: string;
    readonly title: string;
    readonly place: number;
    readonly trackTitle: string | null;
    readonly submissionId: string | null;
    readonly status: HackathonPrizeDeliveryStatus | null;
    readonly note: string | null;
  }[];
  readonly entries: readonly {
    readonly submissionId: string;
    readonly teamName: string;
    readonly title: string;
    readonly isDisqualified: boolean;
  }[];
};

/**
 * Who holds each confirmed prize and how its delivery stands, for the organisers (B-PRZ-02). Closed,
 * with nothing to show, until the results are out.
 */
export const prizeDeliveryResolver = async (
  db: Db,
  eventId: string,
): Promise<Result<PrizeDeliveryView>> => {
  const loaded = await loadPlaceHackathon(db, eventId);
  if (!loaded.ok) return loaded;
  if (!loaded.data.isResultsPublished)
    return ok({ isOpen: false, prizes: [], entries: [] });
  const [prizes, entries] = await Promise.all([
    listPrizeDeliveries(db, eventId),
    listPrizeEntries(db, eventId),
  ]);
  return ok({
    isOpen: true,
    prizes,
    entries: entries.map(({ disqualifiedAt, ...entry }) => ({
      ...entry,
      isDisqualified: disqualifiedAt !== null,
    })),
  });
};

/**
 * Give a prize to an entry in the results (B-PRZ-02), most often because its holder was disqualified.
 * The rule decides first; the write decides again in one statement, and when it lands nothing the rule
 * is asked again so the refusal says why.
 */
export const assignPrizeResolver = async (
  db: Db,
  input: hackathons.PrizeAssignment,
  now: number = Date.now(),
): Promise<Result<{ readonly prizeId: string }>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const decide = async () => {
    const [prizes, entries] = await Promise.all([
      listPrizeDeliveries(db, input.eventId),
      listPrizeEntries(db, input.eventId),
    ]);
    const entry = entries.find(
      ({ submissionId }) => submissionId === input.submissionId,
    );
    return hackathons.decidePrizeAssignment({
      ...loaded.data,
      delivery:
        prizes.find(({ prizeId }) => prizeId === input.prizeId)?.status ?? null,
      entry: entry ? { isDisqualified: entry.disqualifiedAt !== null } : null,
    });
  };
  const decided = await decide();
  if (!decided.ok) return decided;
  const written = await assignPrize(db, {
    ...input,
    awardedAt: new Date(now),
  });
  if (!written) {
    const again = await decide();
    return again.ok
      ? err(
          new AppError('hackathon_prize_not_found', 'No such confirmed prize'),
        )
      : again;
  }
  logger.info('hackathon.prize_assigned', {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
  });
  return ok({ prizeId: input.prizeId });
};

/** Record how a prize's delivery stands, and the organisers' own note on it (B-PRZ-02). */
export const setPrizeDeliveryResolver = async (
  db: Db,
  input: hackathons.PrizeDelivery,
  now: number = Date.now(),
): Promise<Result<{ readonly status: HackathonPrizeDeliveryStatus }>> => {
  const loaded = await loadPlaceHackathon(db, input.eventId);
  if (!loaded.ok) return loaded;
  const held = hackathons.decidePrizeDelivery({
    ...loaded.data,
    isAwarded: true,
  });
  if (!held.ok) return held;
  const written = await setPrizeDelivery(db, { ...input, now: new Date(now) });
  const decided = hackathons.decidePrizeDelivery({
    ...loaded.data,
    isAwarded: written,
  });
  if (!decided.ok) return decided;
  logger.info('hackathon.prize_delivery_recorded', {
    eventId: input.eventId,
    marketCode: loaded.data.marketCode,
    status: input.status,
  });
  return ok({ status: input.status });
};
