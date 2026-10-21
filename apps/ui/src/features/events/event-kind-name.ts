import {
  event_kind_hackathon,
  event_kind_meetup,
  event_kind_workshop,
  type Locale,
} from '@founders-coffee/i18n';
import type { EventFeedItem } from '@founders-coffee/server-fns';

export type EventKind = EventFeedItem['kind'];

const NAMES = {
  meetup: event_kind_meetup,
  workshop: event_kind_workshop,
  hackathon: event_kind_hackathon,
} as const satisfies Record<EventKind, unknown>;

/** The name of an event's type in the reader's language, one wording for the wizard and the badge. */
export const eventKindName = (kind: EventKind, locale: Locale): string =>
  NAMES[kind]({}, { locale });
