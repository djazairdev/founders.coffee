import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from 'drizzle-orm';

import type { HackathonPrizeDeliveryStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import { bound } from './insert-select.js';
import {
  hackathonPrizeAwards,
  hackathonPrizes,
  hackathonResults,
  hackathonTracks,
} from './schema.js';

/** A hackathon's public prizes for its organisers (B-PRZ-02), each with who holds it now. */
export const listPrizeDeliveries = (db: Db, eventId: string) =>
  db
    .select({
      prizeId: hackathonPrizes.id,
      title: hackathonPrizes.title,
      place: hackathonPrizes.place,
      trackTitle: hackathonTracks.title,
      submissionId: hackathonPrizeAwards.submissionId,
      status: hackathonPrizeAwards.deliveryStatus,
      note: hackathonPrizeAwards.privateNote,
    })
    .from(hackathonPrizes)
    .leftJoin(hackathonTracks, eq(hackathonTracks.id, hackathonPrizes.trackId))
    .leftJoin(
      hackathonPrizeAwards,
      eq(hackathonPrizeAwards.prizeId, hackathonPrizes.id),
    )
    .where(
      and(
        eq(hackathonPrizes.eventId, eventId),
        or(
          isNotNull(hackathonPrizes.confirmedAt),
          isNull(hackathonPrizes.providerName),
        ),
      ),
    )
    .orderBy(asc(hackathonPrizes.place), asc(hackathonPrizes.id));

/** The entries in a hackathon's frozen results an organiser can give a prize to, or sees holding one. */
export const listPrizeEntries = (db: Db, eventId: string) =>
  db
    .select({
      submissionId: hackathonResults.submissionId,
      teamName: hackathonResults.teamName,
      title: hackathonResults.title,
      disqualifiedAt: hackathonResults.disqualifiedAt,
    })
    .from(hackathonResults)
    .where(eq(hackathonResults.eventId, eventId))
    .orderBy(
      sql`${hackathonResults.rank} IS NULL`,
      asc(hackathonResults.rank),
      asc(hackathonResults.submissionId),
    );

/**
 * Give a public prize to an entry in the results, in one statement (B-PRZ-02): the entry has to be
 * there and not disqualified, and a prize already received keeps its holder. A new holder starts its
 * delivery again. Returns whether the prize went to the entry.
 */
export const assignPrize = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly prizeId: string;
    readonly submissionId: string;
    readonly awardedAt: Date;
  },
): Promise<boolean> => {
  const rows = await db
    .insert(hackathonPrizeAwards)
    .select(
      db
        .select({
          prizeId: hackathonPrizes.id,
          submissionId: hackathonResults.submissionId,
          awardedAt: bound(
            Math.floor(input.awardedAt.getTime() / 1000),
            'awarded_at',
          ),
          deliveryStatus: sql<HackathonPrizeDeliveryStatus>`'pending'`.as(
            'delivery_status',
          ),
          deliveredAt: sql<null>`NULL`.as('delivered_at'),
          privateNote: sql<null>`NULL`.as('private_note'),
        })
        .from(hackathonPrizes)
        .innerJoin(
          hackathonResults,
          and(
            eq(hackathonResults.eventId, hackathonPrizes.eventId),
            eq(hackathonResults.submissionId, input.submissionId),
            isNull(hackathonResults.disqualifiedAt),
          ),
        )
        .where(
          and(
            eq(hackathonPrizes.id, input.prizeId),
            eq(hackathonPrizes.eventId, input.eventId),
            or(
              isNotNull(hackathonPrizes.confirmedAt),
              isNull(hackathonPrizes.providerName),
            ),
          ),
        ),
    )
    .onConflictDoUpdate({
      target: hackathonPrizeAwards.prizeId,
      set: {
        submissionId: sql`excluded.submission_id`,
        awardedAt: sql`excluded.awarded_at`,
        deliveryStatus: 'pending',
        deliveredAt: null,
      },
      where: sql`${hackathonPrizeAwards.deliveryStatus} <> 'received'`,
    })
    .returning({ prizeId: hackathonPrizeAwards.prizeId });
  return rows.length > 0;
};

/** Record how a prize's delivery stands and the organisers' note. Returns whether it has a holder. */
export const setPrizeDelivery = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly prizeId: string;
    readonly status: HackathonPrizeDeliveryStatus;
    readonly note: string | null;
    readonly now: Date;
  },
): Promise<boolean> => {
  const rows = await db
    .update(hackathonPrizeAwards)
    .set({
      deliveryStatus: input.status,
      deliveredAt: input.status === 'received' ? input.now : null,
      privateNote: input.note,
    })
    .where(
      and(
        eq(hackathonPrizeAwards.prizeId, input.prizeId),
        inArray(
          hackathonPrizeAwards.prizeId,
          db
            .select({ id: hackathonPrizes.id })
            .from(hackathonPrizes)
            .where(eq(hackathonPrizes.eventId, input.eventId)),
        ),
      ),
    )
    .returning({ prizeId: hackathonPrizeAwards.prizeId });
  return rows.length > 0;
};

/** The prizes a team holds and how their delivery stands; none once it is disqualified. */
export const listTeamPrizes = (
  db: Db,
  input: { readonly eventId: string; readonly teamId: string },
) =>
  db
    .select({
      prizeId: hackathonPrizeAwards.prizeId,
      title: hackathonPrizes.title,
      status: hackathonPrizeAwards.deliveryStatus,
    })
    .from(hackathonPrizeAwards)
    .innerJoin(
      hackathonResults,
      eq(hackathonResults.submissionId, hackathonPrizeAwards.submissionId),
    )
    .innerJoin(
      hackathonPrizes,
      eq(hackathonPrizes.id, hackathonPrizeAwards.prizeId),
    )
    .where(
      and(
        eq(hackathonResults.eventId, input.eventId),
        eq(hackathonResults.teamId, input.teamId),
        isNull(hackathonResults.disqualifiedAt),
      ),
    )
    .orderBy(asc(hackathonPrizes.place), asc(hackathonPrizes.id));
