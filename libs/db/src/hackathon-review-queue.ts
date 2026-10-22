import { and, asc, eq, inArray } from 'drizzle-orm';

import type { Money } from '@founders-coffee/core';

import type { Db } from './db.js';
import {
  eventOrganisers,
  events,
  hackathonCriteria,
  hackathonPrizes,
  hackathons,
  hackathonTracks,
  markets,
  organization,
  type Event,
  type Hackathon,
  type HackathonCriterion,
  type HackathonTrack,
} from './schema.js';

export const HACKATHON_REVIEW_PAGE = 50;

export type HackathonReviewPrize = {
  readonly id: string;
  readonly trackId: string | null;
  readonly place: number;
  readonly title: string;
  readonly description: string;
  readonly providerName: string;
  readonly value: Money | null;
  readonly isConfirmed: boolean;
};

export type HackathonForReview = {
  readonly event: Pick<
    Event,
    | 'id'
    | 'title'
    | 'description'
    | 'marketCode'
    | 'cityCode'
    | 'startsAt'
    | 'endsAt'
    | 'format'
    | 'venue'
    | 'meetingUrl'
    | 'language'
    | 'languages'
  >;
  readonly organisation: { readonly name: string; readonly slug: string };
  readonly details: Hackathon;
  readonly timeZone: string;
  readonly tracks: readonly HackathonTrack[];
  readonly prizes: readonly HackathonReviewPrize[];
  readonly criteria: readonly HackathonCriterion[];
};

export type HackathonReviewPage = {
  readonly items: HackathonForReview[];
  readonly hasMore: boolean;
};

/**
 * The tracks, prizes and rubric of the hackathons on one page of the queue (B-HKN-09), in one
 * batch, each in the order its organisers gave it.
 */
const readChildren = async (db: Db, eventIds: readonly string[]) => {
  const ids = [...eventIds];
  const [tracks, prizes, criteria] = await db.batch([
    db
      .select()
      .from(hackathonTracks)
      .where(inArray(hackathonTracks.eventId, ids))
      .orderBy(asc(hackathonTracks.position)),
    db
      .select()
      .from(hackathonPrizes)
      .where(inArray(hackathonPrizes.eventId, ids))
      .orderBy(
        asc(hackathonPrizes.place),
        asc(hackathonPrizes.createdAt),
        asc(hackathonPrizes.id),
      ),
    db
      .select()
      .from(hackathonCriteria)
      .where(inArray(hackathonCriteria.eventId, ids))
      .orderBy(asc(hackathonCriteria.position)),
  ]);
  return { tracks, prizes, criteria };
};

/**
 * One page of the hackathons waiting for review (B-HKN-08), the one sent longest ago first, each
 * with its lead organisation, its market's time zone, and everything participants will see of it:
 * its format and place, its tracks, its prizes and its rubric (B-HKN-09). Reads one row past the
 * page to say whether another follows.
 */
export const listHackathonsForReview = async (
  db: Db,
  page = 0,
): Promise<HackathonReviewPage> => {
  const rows = await db
    .select({
      event: {
        id: events.id,
        title: events.title,
        description: events.description,
        marketCode: events.marketCode,
        cityCode: events.cityCode,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        format: events.format,
        venue: events.venue,
        meetingUrl: events.meetingUrl,
        language: events.language,
        languages: events.languages,
      },
      organisation: { name: organization.name, slug: organization.slug },
      details: hackathons,
      timeZone: markets.timezone,
    })
    .from(hackathons)
    .innerJoin(events, eq(events.id, hackathons.eventId))
    .innerJoin(
      eventOrganisers,
      and(
        eq(eventOrganisers.eventId, events.id),
        eq(eventOrganisers.role, 'lead'),
      ),
    )
    .innerJoin(
      organization,
      eq(organization.id, eventOrganisers.organisationId),
    )
    .innerJoin(markets, eq(markets.code, events.marketCode))
    .where(eq(hackathons.reviewStatus, 'submitted'))
    .orderBy(asc(hackathons.updatedAt), asc(hackathons.eventId))
    .limit(HACKATHON_REVIEW_PAGE + 1)
    .offset(page * HACKATHON_REVIEW_PAGE);
  const shown = rows.slice(0, HACKATHON_REVIEW_PAGE);
  if (shown.length === 0) return { items: [], hasMore: false };
  const children = await readChildren(
    db,
    shown.map((row) => row.event.id),
  );
  const of = <T extends { readonly eventId: string }>(
    list: readonly T[],
    eventId: string,
  ) => list.filter((child) => child.eventId === eventId);
  return {
    items: shown.map((row) => ({
      ...row,
      tracks: of(children.tracks, row.event.id),
      prizes: of(children.prizes, row.event.id).map((prize) => ({
        id: prize.id,
        trackId: prize.trackId,
        place: prize.place,
        title: prize.title,
        description: prize.description,
        providerName: prize.providerName,
        value:
          prize.valueAmountMinor !== null && prize.valueCurrency !== null
            ? {
                amount_minor: prize.valueAmountMinor,
                currency: prize.valueCurrency,
              }
            : null,
        isConfirmed: prize.confirmedAt !== null,
      })),
      criteria: of(children.criteria, row.event.id),
    })),
    hasMore: rows.length > HACKATHON_REVIEW_PAGE,
  };
};
