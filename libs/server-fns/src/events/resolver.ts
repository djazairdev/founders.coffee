import { AppError, err, ok, type Result } from '@founders-coffee/core';
import { events as eventsDomain } from '@founders-coffee/domain';
import {
  getEvent,
  getEventBySlug,
  isVisibleHost,
  listUpcomingEvents,
  listPublicEventHosts,
  type Db,
  type Event,
} from '@founders-coffee/db';

import { attachCityNames, type EventFeedItemBase } from './feed.js';

export { attachCityNames } from './feed.js';
export type { EventFeedItem, EventFeedItemBase } from './feed.js';

/**
 * The meetup a lookup found, if a reader may have it: `event_not_found` when there is none, or when
 * its status can no longer lead to publishing.
 *
 * {@link resolveEvent} and the meetup's page both answer through this, so the page cannot show a
 * meetup the other reads refuse.
 */
export const availableEvent = (
  event: Event | undefined,
  label: string,
): Result<Event> => {
  if (!event)
    return err(new AppError('event_not_found', `No event for ${label}`));
  if (
    event.status === 'draft' ||
    (event.status !== 'published' &&
      !eventsDomain.canTransition(event.status, 'published'))
  ) {
    return err(
      new AppError('event_not_found', `Event ${event.id} is not available`),
    );
  }
  return ok(event);
};

/**
 * Resolve a single event by id or by (marketCode + slug). Returns `event_not_found` on miss.
 *
 * A suppressed host's event answers the same way as one that never existed. The feed already drops
 * those rows in SQL; without the same rule here the link would simply have to be typed rather than
 * clicked, which is not a restriction.
 */
export const resolveEvent = async (
  db: Db,
  input: { id?: string; marketCode?: string; slug?: string },
): Promise<Result<Event>> => {
  const event = input.id
    ? await getEvent(db, input.id)
    : input.marketCode && input.slug
      ? await getEventBySlug(db, input.marketCode, input.slug)
      : undefined;
  const available = availableEvent(event, input.id ?? input.slug ?? '(none)');
  if (!available.ok) return available;
  if (!(await isVisibleHost(db, available.data.hostId))) {
    return err(
      new AppError(
        'event_not_found',
        `Event ${available.data.id} is not available`,
      ),
    );
  }
  return available;
};

export interface EventFeedPage {
  readonly items: readonly EventFeedItemBase[];
  readonly nextCursor: {
    readonly startsAt: number;
    readonly id: string;
  } | null;
}

export type EventFeedCursor = NonNullable<EventFeedPage['nextCursor']>;

/** List upcoming published events, optionally scoped to a market/city (composite cursor). */
export const listEvents = async (
  db: Db,
  opts: {
    marketCode?: string;
    cityCode?: string;
    hostId?: string;
    afterStartsAt?: number;
    afterId?: string;
    limit?: number;
  } = {},
): Promise<EventFeedPage> => {
  const limit = opts.limit ?? 20;
  const rows = await listUpcomingEvents(db, {
    marketCode: opts.marketCode,
    cityCode: opts.cityCode,
    hostId: opts.hostId,
    afterStartsAt: opts.afterStartsAt
      ? new Date(opts.afterStartsAt)
      : undefined,
    afterId: opts.afterId,
    limit: limit + 1,
  });
  const pageRows = rows.slice(0, limit);
  const hostRows = await listPublicEventHosts(
    db,
    pageRows.map((row) => row.hostId),
  );
  const hostMap = new Map(hostRows.map((host) => [host.userId, host]));
  const items = attachCityNames(pageRows, hostMap);
  const hasMore = rows.length > limit;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last
        ? { startsAt: last.startsAt.getTime(), id: last.id }
        : null,
  };
};
