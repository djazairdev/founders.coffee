import {
  AppError,
  err,
  ok,
  type EventKind,
  type Result,
} from '@founders-coffee/core';
import { events as eventsDomain } from '@founders-coffee/domain';
import {
  getEvent,
  getEventBySlug,
  isEventOrganiser,
  isVisibleHost,
  listUpcomingEvents,
  listPublicEventHosts,
  type Db,
  type Event,
} from '@founders-coffee/db';

import {
  attachCityNames,
  readEventOrganisers,
  type EventFeedItemBase,
} from './feed.js';

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
 * {@link availableEvent}, except that a draft is available to its organisers: its host, and the
 * members of an organisation that organises it. Everyone else is told it does not exist, the same
 * answer as for an address nobody holds, so a draft cannot be found by guessing (B-EVT-16).
 */
export const availableToReader = async (
  db: Db,
  event: Event | undefined,
  label: string,
  viewerId: string | null | undefined,
): Promise<Result<Event>> => {
  if (event?.status !== 'draft' || !viewerId)
    return availableEvent(event, label);
  if (
    event.hostId === viewerId ||
    (await isEventOrganiser(db, { eventId: event.id, userId: viewerId }))
  )
    return ok(event);
  return availableEvent(event, label);
};

/**
 * Resolve a single event by id or by (marketCode + slug). Returns `event_not_found` on miss.
 *
 * A suppressed host's event answers the same way as one that never existed. The feed already drops
 * those rows in SQL; without the same rule here the link would simply have to be typed rather than
 * clicked, which is not a restriction. A draft answers only to its organisers.
 */
export const resolveEvent = async (
  db: Db,
  input: { id?: string; marketCode?: string; slug?: string },
  viewerId?: string | null,
): Promise<Result<Event>> => {
  const event = input.id
    ? await getEvent(db, input.id)
    : input.marketCode && input.slug
      ? await getEventBySlug(db, input.marketCode, input.slug)
      : undefined;
  const available = await availableToReader(
    db,
    event,
    input.id ?? input.slug ?? '(none)',
    viewerId,
  );
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
    kind?: EventKind;
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
    kind: opts.kind,
    afterStartsAt: opts.afterStartsAt
      ? new Date(opts.afterStartsAt)
      : undefined,
    afterId: opts.afterId,
    limit: limit + 1,
  });
  const pageRows = rows.slice(0, limit);
  const [hostRows, organisers] = await Promise.all([
    listPublicEventHosts(
      db,
      pageRows.map((row) => row.hostId),
    ),
    readEventOrganisers(
      db,
      pageRows.map((row) => row.id),
    ),
  ]);
  const hostMap = new Map(hostRows.map((host) => [host.userId, host]));
  const items = attachCityNames(pageRows, hostMap, organisers);
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
