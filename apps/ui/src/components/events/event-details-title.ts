import {
  event_details_title,
  event_details_title_other,
  type Locale,
} from '@founders-coffee/i18n';

/** What an event's details are called: only a meetup's say "meetup". */
export const eventDetailsTitle = (kind: string, locale: Locale): string =>
  kind === 'meetup'
    ? event_details_title({}, { locale })
    : event_details_title_other({}, { locale });
