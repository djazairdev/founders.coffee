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
 * A hackathon's prizes as the public sees them (V2): confirmed prizes only, without the private
 * confirmation note. Overall prizes come first, then each track's in the tracks' order, each by place.
 */
export const listPublicHackathonPrizes = async (
  db: Db,
  eventId: string,
): Promise<PublicHackathonPrize[]> => {
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
  return rows.flatMap(
    ({ valueAmountMinor, valueCurrency, confirmedAt, ...prize }) =>
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
};

const unconfirmedPrize = (eventId: string, prizeId: string, version: number) =>
  and(
    eq(hackathonPrizes.eventId, eventId),
    eq(hackathonPrizes.id, prizeId),
    isNull(hackathonPrizes.confirmedAt),
    hackathonAtVersion(eventId, version),
  );

/**
 * The write that rewords a prize its provider has not confirmed (B-HKN-07), only while the
 * hackathon is at `version`; a confirmed prize is never rewritten, since its provider confirmed the
 * terms as they were.
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
      updatedAt: new Date(),
    })
    .where(unconfirmedPrize(input.eventId, input.prizeId, input.version));

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

export type OrganiserHackathonPrize = HackathonPrizeFields & {
  readonly id: string;
  readonly confirmedAt: Date | null;
};

/**
 * Every prize of a hackathon as its organisers see them (B-HKN-07), confirmed or not, without the
 * confirmation note, overall prizes first, then by place.
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
