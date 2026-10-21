import { Link } from '@tanstack/react-router';

import {
  event_type_empty,
  event_type_show_all,
  type Locale,
} from '@founders-coffee/i18n';

import { localizedCity, localizedLanding } from '../../lib/locale-routing';
import { EmptyState } from './EmptyState';

export const EventTypeEmpty = ({
  locale,
  marketSlug,
  citySlug,
}: {
  locale: Locale;
  marketSlug: string;
  citySlug?: string;
}) => {
  const target = citySlug
    ? localizedCity(locale, marketSlug, citySlug)
    : localizedLanding(locale, marketSlug);

  return (
    <EmptyState
      title={event_type_empty({}, { locale })}
      action={
        <Link
          {...target}
          search={{}}
          resetScroll={false}
          className="btn btn-outline btn-xs sm:btn-sm md:btn-md"
        >
          {event_type_show_all({}, { locale })}
        </Link>
      }
    />
  );
};
