import { z } from 'zod';

import {
  EVENT_KINDS,
  eventKindSchema,
  type EventKind,
} from '@founders-coffee/core';
import type { Market } from '@founders-coffee/db';

import {
  paginationQuery,
  publicPaginationSearchSchema,
  type PublicPaginationSearch,
} from './public-pagination';

export type EventTypeSearch = { readonly type: EventKind | undefined };

/**
 * Validate the `type` filter carried in a landing's URL (B-EVT-05). An unknown type resolves to the
 * key set to `undefined`, not to `{}`, for the reason `publicPaginationSearchSchema` gives: the
 * router merges a validator's result over the raw search, and only a named key erases it.
 */
export const eventTypeSearchSchema = z
  .object({ type: z.unknown().optional() })
  .transform(({ type }): EventTypeSearch => ({
    type: eventKindSchema.safeParse(type).data,
  }));

export const landingSearchSchema = publicPaginationSearchSchema.and(
  eventTypeSearchSchema,
);

/** The types a market's pages offer to filter by; hackathons only where the market runs them. */
export const filterableTypes = (
  market: Pick<Market, 'featureFlags'>,
): readonly EventKind[] =>
  market.featureFlags.hackathons
    ? EVENT_KINDS
    : EVENT_KINDS.filter((kind) => kind !== 'hackathon');

/**
 * The search a filter link sets: the type alone, so choosing one starts its list from the top.
 * "All" names the type as `undefined` rather than leaving it out, so that with
 * {@link TYPE_LINK_ACTIVE} it is active only on the unfiltered page; an empty search would match
 * every page as a subset.
 */
export const typeSearch = (type: EventKind | undefined): EventTypeSearch => ({
  type,
});

export const TYPE_LINK_ACTIVE = {
  exact: true,
  includeSearch: true,
  explicitUndefined: true,
};

/**
 * The query a landing's canonical URL keeps. A page of the unfiltered list is its own canonical, so
 * it keeps its cursor; a filtered view names the unfiltered landing instead, so search engines index
 * one list per market or city rather than one per type and page (B-EVT-05).
 */
export const landingCanonicalQuery = (
  pagination: PublicPaginationSearch,
  type: EventKind | undefined,
): string | undefined => (type ? undefined : paginationQuery(pagination));
