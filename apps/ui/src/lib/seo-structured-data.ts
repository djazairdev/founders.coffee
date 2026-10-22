export type JsonLdObject = Record<string, unknown>;

export type StructuredListItem = {
  readonly name: string;
  readonly url: string;
};

import type { EventFormat, EventStatus } from '@founders-coffee/core';
import { zonedIsoString } from '@founders-coffee/i18n';

export type StructuredEventData = {
  readonly title: string;
  readonly description: string;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly createdAt: Date;
  readonly timezone: string;
  readonly status: EventStatus;
  readonly format: EventFormat;
  readonly venue: string | null;
  readonly cityName: string;
  readonly regionName: string | null;
  readonly venueAddress: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly marketCode: string;
  readonly languages: readonly string[];
  readonly url: string;
  readonly image?: string;
  readonly currency: string;
  readonly organizer: { readonly name: string; readonly url: string } | null;
  readonly organisations?: readonly StructuredListItem[];
  readonly registration?: {
    readonly opensAt: Date;
    readonly closesAt: Date;
  } | null;
};

/** JSON-LD as the text of a `<script>`, with `<` escaped so that no value can end the script. */
export const jsonLdText = (value: JsonLdObject): string =>
  JSON.stringify(value).replace(/</gu, '\\u003c');

const ATTENDANCE_MODE: Readonly<Record<EventFormat, string>> = {
  in_person: 'https://schema.org/OfflineEventAttendanceMode',
  online: 'https://schema.org/OnlineEventAttendanceMode',
  hybrid: 'https://schema.org/MixedEventAttendanceMode',
};

/**
 * Where schema.org is told the event happens: its place, a virtual location, or both for a hybrid
 * one. The virtual location carries no URL, because the meeting link is for the host and the
 * members going, and anything in the page's structured data is public.
 */
const locationFor = (
  format: EventFormat,
  place: JsonLdObject,
): JsonLdObject | JsonLdObject[] => {
  const virtual: JsonLdObject = { '@type': 'VirtualLocation' };
  if (format === 'online') return virtual;
  return format === 'hybrid' ? [place, virtual] : place;
};

export const itemListJsonLd = (
  items: readonly StructuredListItem[],
): JsonLdObject => ({
  '@type': 'ItemList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: item.url,
  })),
});

export const collectionPageJsonLd = (input: {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly locale: string;
  readonly items: readonly StructuredListItem[];
}): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: input.name,
  description: input.description,
  url: input.url,
  inLanguage: input.locale,
  mainEntity: itemListJsonLd(input.items),
});

export const breadcrumbJsonLd = (
  items: readonly StructuredListItem[],
): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

/**
 * Who schema.org is told runs the event: the organisations that run a hackathon (B-HKN-24), the
 * lead first, or else the member who hosts it.
 */
const organizerOf = (event: StructuredEventData): JsonLdObject => {
  const organisations = (event.organisations ?? []).map(({ name, url }) => ({
    '@type': 'Organization',
    name,
    url,
  }));
  if (organisations.length > 0)
    return {
      organizer: organisations.length === 1 ? organisations[0] : organisations,
    };
  return event.organizer
    ? {
        organizer: {
          '@type': 'Person',
          name: event.organizer.name,
          url: event.organizer.url,
        },
      }
    : {};
};

/**
 * The schema.org `Event` for a meetup page, shaped the way Google's event documentation asks.
 *
 * The free `Offer` stands for the seat the page offers, so it is there only while RSVPs are open:
 * for a published meetup whose start is still ahead, the same `starts_at` rule the server applies
 * when it refuses an RSVP. It is valid from the meetup's publication, when RSVPs opened. A
 * hackathon's seat is a registration instead (B-HKN-24): offered until registration closes, valid
 * from when it opens. A meetup that has started or ended keeps `EventScheduled`, which is true of
 * one that took place.
 *
 * Times are the market's wall-clock time with its offset, the form Google recommends, rather than
 * UTC. The address is always there, because Google requires one: a meetup stored without a street
 * address still has its city, region and country, which is what Google asks for when there is no
 * street to give.
 */
export const eventJsonLd = (
  event: StructuredEventData,
  now: number = Date.now(),
): JsonLdObject => {
  const localTime = (date: Date): string =>
    zonedIsoString(date.getTime(), event.timezone);
  const offer = event.registration
    ? {
        opensAt: event.registration.opensAt,
        closesAt: event.registration.closesAt.getTime(),
      }
    : { opensAt: event.createdAt, closesAt: event.startsAt.getTime() };
  const place: JsonLdObject = {
    '@type': 'Place',
    ...(event.venue === null ? {} : { name: event.venue }),
    address: {
      '@type': 'PostalAddress',
      ...(event.venueAddress ? { streetAddress: event.venueAddress } : {}),
      addressLocality: event.cityName,
      ...(event.regionName ? { addressRegion: event.regionName } : {}),
      addressCountry: event.marketCode,
    },
    ...(event.latitude !== null && event.longitude !== null
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: event.latitude,
            longitude: event.longitude,
          },
        }
      : {}),
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    url: event.url,
    ...(event.image ? { image: event.image } : {}),
    startDate: localTime(event.startsAt),
    ...(event.endsAt ? { endDate: localTime(event.endsAt) } : {}),
    eventStatus:
      event.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: ATTENDANCE_MODE[event.format],
    inLanguage:
      event.languages.length === 1 ? event.languages[0] : event.languages,
    isAccessibleForFree: true,
    location: locationFor(event.format, place),
    ...(event.status === 'published' && offer.closesAt > now
      ? {
          offers: {
            '@type': 'Offer',
            price: 0,
            priceCurrency: event.currency,
            availability: 'https://schema.org/InStock',
            url: event.url,
            validFrom: localTime(offer.opensAt),
          },
        }
      : {}),
    ...organizerOf(event),
  };
};
