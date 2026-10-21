import type { EventKind } from '@founders-coffee/core';
import type { Market } from '@founders-coffee/db';
import {
  cities_in,
  localizedName,
  no_events_yet,
  type Locale,
} from '@founders-coffee/i18n';
import type { EventFeedItem, EventFeedPage } from '@founders-coffee/server-fns';

import { useUpcomingEvents } from '../../features/events/hooks';
import { useEventPages } from '../../features/events/useEventPages';
import { filterableTypes } from '../../lib/event-type-filter';
import { LoadMoreEvents } from '../events/LoadMoreEvents';
import { EventCard } from '../events/EventCard';
import { EmptyState } from './EmptyState';
import { EventTypeEmpty } from './EventTypeEmpty';
import { EventTypeFilter } from './EventTypeFilter';

const PAGE_SIZE = 20;

type DiscoverFeedProps = {
  locale: Locale;
  market: Market;
  events: readonly EventFeedItem[];
  afterStartsAt?: number;
  afterId?: string;
  nextCursor?: EventFeedPage['nextCursor'];
  type?: EventKind;
};

export const DiscoverFeed = ({
  locale,
  market,
  events,
  afterStartsAt,
  afterId,
  nextCursor,
  type,
}: DiscoverFeedProps) => {
  const pagination = useEventPages(
    useUpcomingEvents(
      {
        marketCode: market.code,
        kind: type,
        limit: PAGE_SIZE,
        afterStartsAt,
        afterId,
      },
      {
        initialPage: { items: events, nextCursor: nextCursor ?? null },
      },
    ),
    events,
  );
  const items = pagination.items;
  const marketName = localizedName(market, locale);

  return (
    <section
      id="market-events"
      className="mx-auto max-w-content scroll-mt-24 px-4 pb-16 pt-8 md:px-8"
    >
      {items.length > 0 || type ? (
        <>
          <h2
            id="market-events-title"
            className="discover-title mb-6 font-display text-h3 font-semibold tracking-tight text-balance md:mb-8 md:text-h2"
          >
            {cities_in({ market: marketName }, { locale })}
          </h2>
          <div className="mb-6 md:mb-8">
            <EventTypeFilter
              locale={locale}
              marketSlug={market.slug}
              types={filterableTypes(market)}
              active={type}
            />
          </div>
          {items.length > 0 ? (
            <>
              <ul
                aria-labelledby="market-events-title"
                className="grid grid-cols-1 gap-3.5"
              >
                {items.map((event) => (
                  <li key={event.id}>
                    <EventCard
                      event={event}
                      locale={locale}
                      timezone={market.timezone}
                      marketSlug={market.slug}
                    />
                  </li>
                ))}
              </ul>

              <LoadMoreEvents locale={locale} pagination={pagination} />
            </>
          ) : (
            <EventTypeEmpty locale={locale} marketSlug={market.slug} />
          )}
        </>
      ) : (
        <EmptyState title={no_events_yet({}, { locale })} />
      )}
    </section>
  );
};
