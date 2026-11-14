import { localizedName, type Locale } from '@founders-coffee/i18n';

export type EventCityNames = {
  readonly cityName: string | null;
  readonly cityNameAr: string | null;
  readonly cityNameFr: string | null;
};

/**
 * The name of an event's city in the reader's language: الجزائر العاصمة in Arabic, Alger in French,
 * Algiers in English.
 *
 * Every read of an event names its city in each language, with the Latin name standing in where a
 * city has no name of its own in one, so an event agrees with the city page it links back to. A
 * French event page that took `cityName` linked back to Le Caire with "Retour à Cairo".
 */
export const eventCityName = (
  event: EventCityNames,
  locale: Locale,
): string | null =>
  event.cityName === null
    ? null
    : localizedName(
    {
      name: event.cityName,
      nameAr: event.cityNameAr ?? event.cityName,
      nameFr: event.cityNameFr ?? event.cityName,
    },
    locale,
  );
