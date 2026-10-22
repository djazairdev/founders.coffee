import { Link } from '@tanstack/react-router';

import type { Market } from '@founders-coffee/db';
import {
  hackathon_workshops_heading,
  type Locale,
} from '@founders-coffee/i18n';

import { EventFormatBadge } from '../../../components/events/EventFormatBadge';
import { localizedEvent } from '../../../lib/locale-routing';
import type { HackathonWorkshopView } from '../api';
import { scheduleMoment } from '../schedule';

const HEADING_ID = 'hackathon-workshops-heading';

export const HackathonWorkshops = ({
  workshops,
  market,
  locale,
}: {
  workshops: readonly HackathonWorkshopView[];
  market: Market;
  locale: Locale;
}) => (
  <section aria-labelledby={HEADING_ID} className="mt-8">
    <h2 id={HEADING_ID} className="font-display text-h4 font-semibold">
      {hackathon_workshops_heading({}, { locale })}
    </h2>
    <ul className="mt-4 grid gap-3">
      {workshops.map((workshop) => (
        <li key={workshop.id}>
          <Link
            {...localizedEvent(locale, market.slug, workshop.slug)}
            className="grid gap-1 rounded-box border border-base-300 bg-base-100 p-3 hover:border-secondary"
          >
            <span className="font-medium break-words">
              <bdi>{workshop.title}</bdi>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-body-sm text-neutral">
              {scheduleMoment(
                new Date(workshop.startsAt).getTime(),
                locale,
                market.timezone,
              )}
              <EventFormatBadge format={workshop.format} locale={locale} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);
