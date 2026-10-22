import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';

import type { Money } from '@founders-coffee/core';

import type { Db } from './db.js';
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
 * prize is written only beside a hackathon that has its details. A track of another hackathon is
 * refused by the composite key.
 */
export const addHackathonPrize = (
  db: Db,
  input: {
    readonly id: string;
    readonly eventId: string;
    readonly prize: HackathonPrizeFields;
  },
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
      .where(eq(hackathons.eventId, input.eventId)),
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
