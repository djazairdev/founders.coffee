import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { hackathon_team_back, type Locale } from '@founders-coffee/i18n';

import { localizedEvent } from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';

export const HackathonTeamFrame = ({
  title,
  locale,
  markets,
  event,
  children,
}: {
  title: string;
  locale: Locale;
  markets: readonly RootMarket[];
  event: {
    readonly title: string;
    readonly slug: string;
    readonly marketCode: string;
  } | null;
  children: ReactNode;
}) => {
  const market = event
    ? markets.find((item) => item.code === event.marketCode)
    : undefined;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="font-display text-h3">{title}</h1>
      {event && market ? (
        <Link
          {...localizedEvent(locale, market.slug, event.slug)}
          className="link link-hover mt-1 inline-block text-body-sm text-neutral"
        >
          <bdi>{event.title}</bdi>
          <span className="sr-only">
            {' '}
            {hackathon_team_back({}, { locale })}
          </span>
        </Link>
      ) : null}
      {children}
    </div>
  );
};
