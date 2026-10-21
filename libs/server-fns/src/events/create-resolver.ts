import {
  AppError,
  err,
  id,
  ok,
  type Locale,
  type Result,
} from '@founders-coffee/core';
import {
  events as eventsDomain,
  geo,
  markets,
  type EventCreateInput,
} from '@founders-coffee/domain';
import {
  createEventIfRouteAvailable,
  getMarketByCode,
  getOrganisation,
  type Db,
  type Event,
  type NewEvent,
} from '@founders-coffee/db';
import { reportError } from '@founders-coffee/observability';

import { locatePoint, type LocatedPoint } from '../maps/locate.js';
import type { MapProvider } from '../maps/provider.js';
import { attendHostOwnEvent } from './host-attendance.js';

type EventPlacement = Omit<LocatedPoint, 'address'> & {
  readonly address: string | null;
};

/** The city the host named, and its state, inside this market; anything else is refused. */
const namedCity = (
  marketCode: string,
  cityCode: string,
  address: string | null,
): Result<EventPlacement> => {
  const chosen = geo.findCity(marketCode, cityCode);
  if (!chosen) {
    return err(
      new AppError(
        'validation_failed',
        `Unknown city ${cityCode} for ${marketCode}`,
      ),
    );
  }
  return ok({ stateCode: chosen.stateCode, cityCode: chosen.code, address });
};

/**
 * Where this event is, and the address to publish with it.
 *
 * The point the host chose is the location; the city and state are labels derived from it so the
 * per-state counts describe where events actually are rather than where a host said they were. A
 * host may override the city on the confirmation step, and an override is trusted only far enough
 * to name a city inside this market — the state still comes from the city, never from the client.
 * An online event has no point, so the city it names is its city, and it has no address.
 *
 * The venue *name* stays host-authored. Mapbox indexes almost no points of interest in the Maghreb,
 * so a provider name is unavailable exactly where it would be most useful, and "15 Rue Yousfi
 * Mohamed" tells an attendee nothing about which door to walk through.
 */
const eventLocation = async (
  mapProvider: MapProvider,
  input: EventCreateInput,
  locale: Locale,
): Promise<Result<EventPlacement>> => {
  if (input.latitude === undefined || input.longitude === undefined)
    return input.cityCode === undefined
      ? err(new AppError('validation_failed', 'An online event names its city'))
      : namedCity(input.marketCode, input.cityCode, null);

  const located = await locatePoint(mapProvider, {
    marketCode: input.marketCode,
    locale,
    latitude: input.latitude,
    longitude: input.longitude,
    snapshotProviderId: input.venueProviderId,
    fallbackAddress: input.venueAddress,
  });
  if (!located.ok || !input.cityCode) return located;
  return namedCity(input.marketCode, input.cityCode, located.data.address);
};

const slugify = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');

const MAX_EVENT_SLUG_LENGTH = 80;

export const eventSlugCandidates = (
  title: string,
  eventId: string,
): readonly [string, string] => {
  const base = slugify(title) || 'event';
  const suffix = eventId.replace(/^evt_/, '').toLowerCase();
  const suffixedBase = base.slice(
    0,
    Math.max(1, MAX_EVENT_SLUG_LENGTH - suffix.length - 1),
  );
  return [base, `${suffixedBase}-${suffix}`];
};

/**
 * Validate + create a new event. Generates the id + slug, requires an enabled visible D1 market,
 * resolves canonical geo state/city, verifies the venue, and inserts the complete free-event row.
 * Given a lead organisation, already authorised by `requireOrganisationPermission`, it names that
 * organisation as the event's lead in the same batch (B-EVT-17). An organisation leads events only
 * in its own market; any other answers `forbidden` before anything is written.
 */
export const createEventResolverWithId = async (
  db: Db,
  mapProvider: MapProvider,
  hostId: string,
  input: EventCreateInput,
  eventId: string,
  leadOrganisationId?: string,
): Promise<Result<Event>> => {
  try {
    const market = await getMarketByCode(db, input.marketCode);
    if (!market || !markets.isMarketVisible(market.state)) {
      return err(
        new AppError(
          'event_market_unavailable',
          'Event creation is unavailable in this market',
        ),
      );
    }
    if (!market.featureFlags.events) {
      return err(
        new AppError(
          'event_creation_disabled',
          'Event creation is currently disabled in this market',
        ),
      );
    }
    if (
      leadOrganisationId &&
      (await getOrganisation(db, leadOrganisationId))?.marketCode !==
        market.code
    ) {
      return err(
        new AppError(
          'forbidden',
          'An organisation leads events only in its own market',
        ),
      );
    }

    const language = eventsDomain.leadLocale(
      input.languages,
      market.defaultLocale,
    );
    const located = await eventLocation(mapProvider, input, language);
    if (!located.ok) return located;

    const row: Omit<NewEvent, 'slug'> = {
      id: eventId,
      hostId,
      marketCode: market.code,
      stateCode: located.data.stateCode,
      cityCode: located.data.cityCode,
      title: input.title,
      description: input.description,
      venue: input.venueName ?? null,
      venueAddress: located.data.address,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      language,
      languages: input.languages,
      kind: input.kind,
      tags: input.tags,
      format: input.format,
      meetingUrl: input.meetingUrl ?? null,
      status: 'published',
    };

    for (const slug of eventSlugCandidates(input.title, eventId)) {
      const created = await createEventIfRouteAvailable(
        db,
        { ...row, slug },
        leadOrganisationId,
      );
      if (created) {
        await attendHostOwnEvent(db, created.id, hostId);
        return ok(created);
      }
    }

    return err(
      new AppError(
        'event_route_conflict',
        `Unable to reserve an event route in ${input.marketCode}`,
      ),
    );
  } catch (error) {
    reportError(error, {
      operation: 'create_event',
      market: input.marketCode,
      city: input.cityCode,
    });
    return err(
      new AppError('event_creation_failed', 'The event could not be created'),
    );
  }
};

export const createEventResolver = async (
  db: Db,
  mapProvider: MapProvider,
  hostId: string,
  input: EventCreateInput,
  leadOrganisationId?: string,
): Promise<Result<Event>> =>
  createEventResolverWithId(
    db,
    mapProvider,
    hostId,
    input,
    id('evt'),
    leadOrganisationId,
  );
