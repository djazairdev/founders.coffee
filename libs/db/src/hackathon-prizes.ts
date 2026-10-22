import { and, asc, eq, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';

import type { Money } from '@founders-coffee/core';

import type { Db } from './db.js';
import { hackathonAtVersion } from './hackathon-edits.js';
import { bound } from './insert-select.js';
import { hackathonPrizes, hackathons, hackathonTracks } from './schema.js';

export type HackathonPrizeFields = {
  readonly trackId: string | null;
  readonly place: number;
  readonly title: string;
  readonly description: string;
  readonly providerName: string;
  readonly value: Money | null;
};

export type PublicHackathonPrize = HackathonPrizeFields & {
  readonly id: string;
  readonly confirmedAt: Date;
};

/**
 * Add a prize to a hackathon (B-HKN-04), unconfirmed, selected from the hackathon's own row, so a
 * prize is written only beside a hackathon that has its details, and only while `isWritable` holds:
 * an organiser's edit passes {@link hackathonAtVersion}. A track of another hackathon is refused by
 * the composite key.
 */
export const addHackathonPrize = (
  db: Db,
  input: {
    readonly id: string;
    readonly eventId: string;
    readonly prize: HackathonPrizeFields;
  },
  isWritable: SQL = sql`1`,
) => {
  const { prize } = input;
  return db.insert(hackathonPrizes).select(
    db
      .select({
        id: bound(input.id, 'id'),
        eventId: hackathons.eventId,
        trackId: bound(prize.trackId, 'track_id'),
        place: bound(prize.place, 'place'),
        title: bound(prize.title, 'title'),
        description: bound(prize.description, 'description'),
        providerName: bound(prize.providerName, 'provider_name'),
        valueAmountMinor: bound(
          prize.value?.amount_minor ?? null,
          'value_amount_minor',
        ),
        valueCurrency: bound(prize.value?.currency ?? null, 'value_currency'),
        confirmedAt: bound(null, 'confirmed_at'),
        confirmationNote: bound(null, 'confirmation_note'),
        createdAt: sql`unixepoch()`.as('created_at'),
        updatedAt: sql`unixepoch()`.as('updated_at'),
      })
      .from(hackathons)
      .where(and(eq(hackathons.eventId, input.eventId), isWritable)),
  );
};

/**
 * The query behind {@link listPublicHackathonPrizes}, for a batch that names the hackathon by a
 * subquery rather than an id it already holds (the event page, B-HKN-18).
 */
export const publicHackathonPrizesQuery = (db: Db, eventId: string | SQL) =>
  db
    .select({
      id: hackathonPrizes.id,
      trackId: hackathonPrizes.trackId,
      place: hackathonPrizes.place,
      title: hackathonPrizes.title,
      description: hackathonPrizes.description,
      providerName: hackathonPrizes.providerName,
      valueAmountMinor: hackathonPrizes.valueAmountMinor,
      valueCurrency: hackathonPrizes.valueCurrency,
      confirmedAt: hackathonPrizes.confirmedAt,
    })
    .from(hackathonPrizes)
    .leftJoin(hackathonTracks, eq(hackathonTracks.id, hackathonPrizes.trackId))
    .where(
      and(
        eq(hackathonPrizes.eventId, eventId),
        isNotNull(hackathonPrizes.confirmedAt),
      ),
    )
    .orderBy(
      sql`${hackathonTracks.position} IS NOT NULL`,
      asc(hackathonTracks.position),
      asc(hackathonPrizes.place),
      asc(hackathonPrizes.createdAt),
      asc(hackathonPrizes.id),
    );

/**
 * The rows of {@link publicHackathonPrizesQuery} as prizes, each value a `Money`.
 */
export const publicHackathonPrizesOf = (
  rows: Awaited<ReturnType<typeof publicHackathonPrizesQuery>>,
): PublicHackathonPrize[] =>
  rows.flatMap(({ valueAmountMinor, valueCurrency, confirmedAt, ...prize }) =>
    confirmedAt
      ? [
          {
            ...prize,
            value:
              valueAmountMinor !== null && valueCurrency !== null
                ? { amount_minor: valueAmountMinor, currency: valueCurrency }
                : null,
            confirmedAt,
          },
        ]
      : [],
  );

/**
 * A hackathon's prizes as the public sees them (V2): confirmed prizes only, without the private
 * confirmation note. Overall prizes come first, then each track's in the tracks' order, each by place.
 */
export const listPublicHackathonPrizes = async (
  db: Db,
  eventId: string,
): Promise<PublicHackathonPrize[]> =>
  publicHackathonPrizesOf(await publicHackathonPrizesQuery(db, eventId));

const prizeAtVersion = (eventId: string, prizeId: string, version: number) =>
  and(
    eq(hackathonPrizes.eventId, eventId),
    eq(hackathonPrizes.id, prizeId),
    hackathonAtVersion(eventId, version),
  );

const unconfirmedPrize = (eventId: string, prizeId: string, version: number) =>
  and(
    prizeAtVersion(eventId, prizeId, version),
    isNull(hackathonPrizes.confirmedAt),
  );

/**
 * Whether a prize keeps its confirmation through a change (B-HKN-10): its provider confirmed a
 * title and a value, so it holds while they and the provider stay as they were, compared against
 * the row before the change, as SQLite evaluates every assignment of an `UPDATE`.
 */
const keepsConfirmation = (prize: HackathonPrizeFields): SQL =>
  sql`${hackathonPrizes.title} = ${prize.title} AND ${hackathonPrizes.providerName} = ${prize.providerName} AND ${hackathonPrizes.valueAmountMinor} IS ${prize.value?.amount_minor ?? null} AND ${hackathonPrizes.valueCurrency} IS ${prize.value?.currency ?? null}`;

/**
 * The write that rewords a prize (B-HKN-07), only while the hackathon is at `version`. A new title,
 * value or provider takes a confirmed prize's confirmation and note away in the same statement
 * (B-HKN-10), so it is off the public page until its provider confirms the new terms.
 */
export const hackathonPrizeChange = (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly prizeId: string;
    readonly prize: HackathonPrizeFields;
  },
) =>
  db
    .update(hackathonPrizes)
    .set({
      trackId: input.prize.trackId,
      place: input.prize.place,
      title: input.prize.title,
      description: input.prize.description,
      providerName: input.prize.providerName,
      valueAmountMinor: input.prize.value?.amount_minor ?? null,
      valueCurrency: input.prize.value?.currency ?? null,
      confirmedAt: sql`CASE WHEN ${keepsConfirmation(input.prize)} THEN ${hackathonPrizes.confirmedAt} END`,
      confirmationNote: sql`CASE WHEN ${keepsConfirmation(input.prize)} THEN ${hackathonPrizes.confirmationNote} END`,
      updatedAt: new Date(),
    })
    .where(prizeAtVersion(input.eventId, input.prizeId, input.version));

/** The write that withdraws a prize its provider has not confirmed (B-HKN-07), at `version`. */
export const hackathonPrizeRemoval = (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly prizeId: string;
  },
) =>
  db
    .delete(hackathonPrizes)
    .where(unconfirmedPrize(input.eventId, input.prizeId, input.version));

/**
 * The write that marks a prize confirmed (B-HKN-10), with the organisers' private note of who
 * confirmed it, when and how, only while it is unconfirmed and the hackathon is at `version`.
 */
export const hackathonPrizeConfirmation = (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly prizeId: string;
    readonly note: string;
    readonly confirmedAt: Date;
  },
) =>
  db
    .update(hackathonPrizes)
    .set({
      confirmedAt: input.confirmedAt,
      confirmationNote: input.note,
      updatedAt: new Date(),
    })
    .where(unconfirmedPrize(input.eventId, input.prizeId, input.version));

export type OrganiserHackathonPrize = HackathonPrizeFields & {
  readonly id: string;
  readonly confirmedAt: Date | null;
  readonly confirmationNote: string | null;
};

/**
 * Every prize of a hackathon as its organisers see them (B-HKN-07), confirmed or not, with their
 * private confirmation note (B-HKN-10), overall prizes first, then by place.
 */
export const listOrganiserHackathonPrizes = async (
  db: Db,
  eventId: string,
): Promise<OrganiserHackathonPrize[]> => {
  const rows = await db
    .select({
      id: hackathonPrizes.id,
      trackId: hackathonPrizes.trackId,
      place: hackathonPrizes.place,
      title: hackathonPrizes.title,
      description: hackathonPrizes.description,
      providerName: hackathonPrizes.providerName,
      valueAmountMinor: hackathonPrizes.valueAmountMinor,
      valueCurrency: hackathonPrizes.valueCurrency,
      confirmedAt: hackathonPrizes.confirmedAt,
      confirmationNote: hackathonPrizes.confirmationNote,
    })
    .from(hackathonPrizes)
    .where(eq(hackathonPrizes.eventId, eventId))
    .orderBy(
      sql`${hackathonPrizes.trackId} IS NOT NULL`,
      asc(hackathonPrizes.place),
      asc(hackathonPrizes.createdAt),
      asc(hackathonPrizes.id),
    );
  return rows.map(({ valueAmountMinor, valueCurrency, ...prize }) => ({
    ...prize,
    value:
      valueAmountMinor !== null && valueCurrency !== null
        ? { amount_minor: valueAmountMinor, currency: valueCurrency }
        : null,
  }));
};
