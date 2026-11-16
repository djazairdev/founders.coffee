import { shortId } from '@founders-coffee/core';
import {
  cityInputs,
  event_meta_cancelled_city_summary,
  event_meta_cancelled_hackathon_city_summary,
  event_meta_cancelled_hackathon_summary,
  event_meta_cancelled_summary,
  event_meta_cancelled_workshop_city_summary,
  event_meta_cancelled_workshop_summary,
  event_meta_city_summary,
  event_meta_description,
  event_meta_hackathon_description,
  event_meta_hackathon_city_summary,
  event_meta_hackathon_summary,
  event_meta_summary,
  event_meta_workshop_city_summary,
  event_meta_workshop_description,
  event_meta_workshop_summary,
  type Locale,
} from '@founders-coffee/i18n';

import { eventWhen } from './event-when';
import { markdownPlainText } from './markdown-plain-text';
import {
  breadcrumbJsonLd,
  eventJsonLd,
  jsonLdText,
  type StructuredEventData,
  type StructuredListItem,
} from './seo-structured-data';
import {
  buildTitledPageMetadata,
  getSiteOrigin,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  type CanonicalRoute,
} from './seo';
import { buildLeadingTitle, clipAtWord } from './seo-text';

type EventHeadInput = {
  readonly locale: Locale;
  readonly marketCode: string;
  readonly eventId: string;
  readonly version: number;
  readonly title: string;
  readonly kind?: 'hackathon' | 'meetup' | 'workshop';
  readonly cityName: string;
  readonly description?: string;
  readonly route: Extract<CanonicalRoute, { readonly type: 'event' }>;
  readonly structuredEvent: StructuredEventData;
  readonly breadcrumbs: readonly StructuredListItem[];
};

/**
 * The card a shared event previews as.
 *
 * `version` is in the address rather than only in the render: a scraper keeps the picture it first
 * fetched, so an edited title that reused this URL would keep showing the old one for as long as
 * the scraper held it.
 */
export const eventCardUrl = (
  locale: Locale,
  eventId: string,
  version: number,
): string =>
  `${getSiteOrigin()}/og/e/${shortId(eventId)}?l=${locale}&v=${version}`;

/**
 * What a search result or a shared link says of an event before anyone opens it.
 *
 * When and where come first, in the page's language, because they are what a reader decides on and
 * what a host's own words rarely say; the host's words follow in whatever room is left. A cancelled
 * event says so before anything else.
 */
const eventSnippet = (
  locale: Locale,
  kind: 'hackathon' | 'meetup' | 'workshop',
  event: StructuredEventData,
  cityName: string,
  hostWords: string,
): string => {
  const { day, clock } = eventWhen(event.startsAt, event.timezone, locale);
  const facts = { day, time: clock, city: cityName };
  const cancelled = event.status === 'cancelled';
  const summary =
    event.venue === null
      ? (cancelled
          ? kind === 'hackathon'
            ? event_meta_cancelled_hackathon_city_summary
            : kind === 'workshop'
              ? event_meta_cancelled_workshop_city_summary
              : event_meta_cancelled_city_summary
          : kind === 'hackathon'
            ? event_meta_hackathon_city_summary
            : kind === 'workshop'
              ? event_meta_workshop_city_summary
              : event_meta_city_summary)(facts, { locale })
      : (cancelled
          ? kind === 'hackathon'
            ? event_meta_cancelled_hackathon_summary
            : kind === 'workshop'
              ? event_meta_cancelled_workshop_summary
              : event_meta_cancelled_summary
          : kind === 'hackathon'
            ? event_meta_hackathon_summary
            : kind === 'workshop'
              ? event_meta_workshop_summary
              : event_meta_summary)(
          { ...facts, venue: event.venue },
          { locale },
        );
  return clipAtWord(`${summary} ${hostWords}`, MAX_DESCRIPTION_LENGTH);
};

export const eventPageHead = ({
  locale,
  marketCode,
  eventId,
  version,
  title,
  kind = 'meetup',
  cityName,
  description,
  route,
  structuredEvent,
  breadcrumbs,
}: EventHeadInput) => {
  const hostWords = description ? markdownPlainText(description) : '';
  const structuredDescription = description
    ? markdownPlainText(description)
    : '';
  const city = cityInputs(cityName);
  const fallbackDescription =
    kind === 'hackathon'
      ? event_meta_hackathon_description({ title, ...city }, { locale })
      : kind === 'workshop'
        ? event_meta_workshop_description({ title, ...city }, { locale })
        : event_meta_description({ title, ...city }, { locale });
  const metadata = buildTitledPageMetadata({
    locale,
    documentTitle: buildLeadingTitle([title, cityName]),
    socialTitle: clipAtWord(title, MAX_TITLE_LENGTH),
    description: eventSnippet(
      locale,
      kind,
      structuredEvent,
      cityName,
      hostWords,
    ),
    route,
    marketCode,
    socialImage: {
      url: eventCardUrl(locale, eventId, version),
      alt: `${title} · ${cityName}`,
    },
  });
  const eventSchema = eventJsonLd({
    ...structuredEvent,
    image: structuredEvent.image ?? eventCardUrl(locale, eventId, version),
    description: clipAtWord(
      structuredDescription || fallbackDescription,
      MAX_DESCRIPTION_LENGTH,
    ),
  });
  return {
    ...metadata,
    scripts: [
      {
        type: 'application/ld+json',
        children: jsonLdText(eventSchema),
      },
      {
        type: 'application/ld+json',
        children: jsonLdText(breadcrumbJsonLd(breadcrumbs)),
      },
    ],
  };
};
