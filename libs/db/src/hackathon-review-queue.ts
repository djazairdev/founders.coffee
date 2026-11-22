import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';

import type { Money } from '@founders-coffee/core';

import type { Db } from './db.js';
import {
  eventOrganisers,
  events,
  hackathonCriteria,
  hackathonPrizes,
  hackathonSectionDrafts,
  hackathons,
  hackathonTracks,
  markets,
  organization,
  user,
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
  readonly providerName: string | null;
  readonly value: Money | null;
  readonly isConfirmed: boolean;
};

export type HackathonForReview = {
  readonly creatorEmail: string;
  readonly event: Pick<
    Event,
    | 'id'
    | 'version'
    | 'updatedAt'
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
  readonly organisation: {
    readonly name: string;
    readonly slug: string;
  } | null;
  readonly details: Hackathon | null;
  readonly sectionDrafts: {
    readonly deadlines: unknown;
    readonly settings: unknown;
  } | null;
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
 * One page of hackathon draft events, including those without saved details (B-HKN-09), the oldest
 * edit first. Reads one row past the page to say whether another follows.
 */
export const listHackathonsForReview = async (
  db: Db,
  page = 0,
): Promise<HackathonReviewPage> => {
  const rows = await db
    .select({
      creatorEmail: user.email,
      event: {
        id: events.id,
        version: events.version,
        updatedAt: events.updatedAt,
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
      sectionDrafts: {
        deadlines: hackathonSectionDrafts.deadlines,
        settings: hackathonSectionDrafts.settings,
      },
      timeZone: markets.timezone,
    })
    .from(events)
    .innerJoin(user, eq(user.id, events.hostId))
    .leftJoin(hackathons, eq(hackathons.eventId, events.id))
    .leftJoin(
      eventOrganisers,
      and(
        eq(eventOrganisers.eventId, events.id),
        eq(eventOrganisers.role, 'lead'),
      ),
    )
    .leftJoin(organization, eq(organization.id, eventOrganisers.organisationId))
    .leftJoin(
      hackathonSectionDrafts,
      eq(hackathonSectionDrafts.eventId, events.id),
    )
    .innerJoin(markets, eq(markets.code, events.marketCode))
    .where(
      and(
        eq(events.kind, 'hackathon'),
        eq(events.status, 'draft'),
        or(
          isNull(hackathons.reviewStatus),
          inArray(hackathons.reviewStatus, ['draft', 'submitted']),
        ),
      ),
    )
    .orderBy(asc(events.updatedAt), asc(events.id))
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
      organisation: row.organisation?.name ? row.organisation : null,
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
        isConfirmed: prize.confirmedAt !== null || prize.providerName === null,
      })),
      criteria: of(children.criteria, row.event.id),
    })),
    hasMore: rows.length > HACKATHON_REVIEW_PAGE,
  };
};
