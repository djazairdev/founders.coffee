import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import { eventEndsAt } from './events-end.js';
import { upcomingScope } from './events.js';
import { visibleHost } from './profile-access.js';
import {
  eventOrganisers,
  events,
  markets,
  organization,
  type Event,
  type Market,
  type Organization,
} from './schema.js';

export type PublicOrganisation = Pick<
  Organization,
  | 'id'
  | 'name'
  | 'slug'
  | 'kind'
  | 'description'
  | 'websiteUrl'
  | 'marketCode'
  | 'cityCode'
>;

export type OrganisationPageRows = {
  readonly organisation: PublicOrganisation | null;
  readonly upcoming: readonly Event[];
  readonly past: readonly Event[];
};

/**
 * An approved organisation by its slug, with its upcoming and past events, in one trip to D1
 * (B-ORG-11).
 *
 * The organisation is shown only while it is approved and its market is one visitors can see; a
 * pending, rejected or suspended one reads as no organisation at all, as it does on an event's
 * label. The events are the published ones it organises, as their lead or a co-host, found by the
 * same slug through a subquery, so neither list waits for the organisation's row. Upcoming events
 * follow discovery's rule ({@link upcomingScope}), soonest first; past ones follow a meetup page's
 * ({@link visibleHost}), latest first, so an erased host's meetup stays in the record.
 */
export const readOrganisationPageRows = async (
  db: Db,
  input: {
    readonly slug: string;
    readonly marketStates: readonly Market['state'][];
    readonly limit: number;
    readonly now: Date;
  },
): Promise<OrganisationPageRows> => {
  const shown = and(
    eq(organization.slug, input.slug),
    eq(organization.status, 'approved'),
    inArray(markets.state, [...input.marketStates]),
  );
  const organisationId = sql`(${db
    .select({ id: organization.id })
    .from(organization)
    .innerJoin(markets, eq(markets.code, organization.marketCode))
    .where(shown)})`;
  const organised = and(
    eq(events.status, 'published'),
    sql`exists (select 1 from ${eventOrganisers} where ${eventOrganisers.eventId} = ${events.id} and ${eventOrganisers.organisationId} = ${organisationId})`,
  );
  const [organisations, upcoming, past] = await db.batch([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        kind: organization.kind,
        description: organization.description,
        websiteUrl: organization.websiteUrl,
        marketCode: organization.marketCode,
        cityCode: organization.cityCode,
      })
      .from(organization)
      .innerJoin(markets, eq(markets.code, organization.marketCode))
      .where(shown)
      .limit(1),
    db
      .select()
      .from(events)
      .where(and(organised, upcomingScope(input.now)))
      .orderBy(asc(events.startsAt), asc(events.id))
      .limit(input.limit),
    db
      .select()
      .from(events)
      .where(
        and(
          organised,
          visibleHost(events.hostId),
          sql`${eventEndsAt()} <= ${Math.floor(input.now.getTime() / 1000)}`,
        ),
      )
      .orderBy(desc(events.startsAt), desc(events.id))
      .limit(input.limit),
  ]);
  const organisation = organisations[0] ?? null;
  return organisation
    ? { organisation, upcoming, past }
    : { organisation: null, upcoming: [], past: [] };
};

/** The slugs of the organisations whose pages the sitemap lists: approved, in a market visitors can see. */
export const listPublicOrganisationSlugs = async (
  db: Db,
  marketStates: readonly Market['state'][],
): Promise<string[]> =>
  (
    await db
      .select({ slug: organization.slug })
      .from(organization)
      .innerJoin(markets, eq(markets.code, organization.marketCode))
      .where(
        and(
          eq(organization.status, 'approved'),
          inArray(markets.state, [...marketStates]),
        ),
      )
      .orderBy(organization.slug)
  ).map((row) => row.slug);
