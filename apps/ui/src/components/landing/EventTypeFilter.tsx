import { Link } from '@tanstack/react-router';

import type { EventKind } from '@founders-coffee/core';
import {
  event_type_all,
  event_type_filter_label,
  event_type_hackathons,
  event_type_meetups,
  event_type_workshops,
  type Locale,
} from '@founders-coffee/i18n';

import { TYPE_LINK_ACTIVE, typeSearch } from '../../lib/event-type-filter';
import { localizedCity, localizedLanding } from '../../lib/locale-routing';

const LABELS = {
  meetup: event_type_meetups,
  workshop: event_type_workshops,
  hackathon: event_type_hackathons,
} as const satisfies Record<EventKind, typeof event_type_all>;

type EventTypeFilterProps = {
  locale: Locale;
  marketSlug: string;
  citySlug?: string;
  types: readonly EventKind[];
  active: EventKind | undefined;
};

export const EventTypeFilter = ({
  locale,
  marketSlug,
  citySlug,
  types,
  active,
}: EventTypeFilterProps) => {
  const target = citySlug
    ? localizedCity(locale, marketSlug, citySlug)
    : localizedLanding(locale, marketSlug);
  const options = [undefined, ...types] as const;

  return (
    <nav aria-label={event_type_filter_label({}, { locale })}>
      <ul className="flex flex-wrap gap-2">
        {options.map((type) => {
          const isActive = type === active;
          return (
            <li key={type ?? 'all'}>
              <Link
                {...target}
                search={typeSearch(type)}
                activeOptions={TYPE_LINK_ACTIVE}
                resetScroll={false}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex h-10 items-center whitespace-nowrap rounded-full px-3.5 text-body-sm font-medium transition-colors duration-[var(--duration-fast)] motion-reduce:transition-none ${
                  isActive
                    ? 'bg-primary text-primary-content shadow-[var(--shadow-1)]'
                    : 'bg-base-200 text-base-content hover:bg-base-300'
                }`}
              >
                {type
                  ? LABELS[type]({}, { locale })
                  : event_type_all({}, { locale })}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
