import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  city_empty_title,
  cityInputs,
  event_type_empty,
  event_type_show_all,
  no_events_yet,
  type Locale,
} from '@founders-coffee/i18n';

import { CityLanding } from './CityLanding';
import { DiscoverFeed } from './DiscoverFeed';
import { EventTypeFilter } from './EventTypeFilter';
import { market, meetup, oran } from './city-landing.fixtures';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    params,
    search,
    'aria-current': ariaCurrent,
  }: {
    children: ReactNode;
    className?: string;
    params: { locale: string; market: string; city?: string };
    search?: { type?: string };
    'aria-current'?: 'page';
  }) =>
    createElement(
      'a',
      {
        href: `/${params.locale}/${params.market}${params.city ? `/${params.city}` : ''}${search?.type ? `?type=${search.type}` : ''}`,
        className,
        'aria-current': ariaCurrent,
      },
      children,
    ),
}));
vi.mock('../../features/auth/hooks', () => ({
  usePublicAuthConfig: () => ({ data: undefined }),
}));
vi.mock('../../features/hackathons/hooks', () => ({
  useJoinHackathonInterest: () => ({ isPending: false, isSuccess: false }),
}));
vi.mock('../../features/events/hooks', () => ({
  useUpcomingEvents: () => ({
    data: undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => undefined,
  }),
}));

const LABELS = {
  ar: ['الكل', 'لقاءات', 'ورشات', 'هاكاثونات'],
  fr: ['Tout', 'Rencontres', 'Ateliers', 'Hackathons'],
  en: ['All', 'Meetups', 'Workshops', 'Hackathons'],
} as const satisfies Record<Locale, readonly string[]>;

const filterLinks = () =>
  within(screen.getByRole('navigation')).getAllByRole('link');

afterEach(cleanup);

describe('the event type filter (B-EVT-05)', () => {
  it.each(['ar', 'fr', 'en'] as const)(
    'offers every type in %s, each a link that starts its list from the top',
    (locale) => {
      render(
        <EventTypeFilter
          locale={locale}
          marketSlug="algeria"
          types={['meetup', 'workshop', 'hackathon']}
          active="workshop"
        />,
      );

      const links = filterLinks();
      expect(links.map((link) => link.textContent)).toEqual(LABELS[locale]);
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        `/${locale}/algeria`,
        `/${locale}/algeria?type=meetup`,
        `/${locale}/algeria?type=workshop`,
        `/${locale}/algeria?type=hackathon`,
      ]);
      expect(links.map((link) => link.getAttribute('aria-current'))).toEqual([
        null,
        null,
        'page',
        null,
      ]);
    },
  );

  it('marks All as current on the unfiltered page, and keeps the city in a city’s links', () => {
    render(
      <EventTypeFilter
        locale="en"
        marketSlug="algeria"
        citySlug="oran"
        types={['meetup', 'workshop']}
        active={undefined}
      />,
    );

    const links = filterLinks();
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/en/algeria/oran',
      '/en/algeria/oran?type=meetup',
      '/en/algeria/oran?type=workshop',
    ]);
    expect(links[0]?.getAttribute('aria-current')).toBe('page');
  });

  it('leaves hackathons out of a market that does not run them', () => {
    render(<DiscoverFeed locale="en" market={market} events={[meetup()]} />);

    expect(filterLinks().map((link) => link.textContent)).toEqual([
      'All',
      'Meetups',
      'Workshops',
    ]);
  });

  it('offers hackathons where the market runs them', () => {
    render(
      <DiscoverFeed
        locale="en"
        market={{
          ...market,
          featureFlags: { ...market.featureFlags, hackathons: true },
        }}
        events={[meetup()]}
      />,
    );

    expect(filterLinks().map((link) => link.textContent)).toContain(
      'Hackathons',
    );
  });

  it('says a filtered market page has none of that type, with the way back to all', () => {
    render(
      <DiscoverFeed locale="en" market={market} events={[]} type="workshop" />,
    );

    expect(
      screen.getByRole('heading', {
        name: event_type_empty({}, { locale: 'en' }),
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: event_type_show_all({}, { locale: 'en' }) })
        .getAttribute('href'),
    ).toBe('/en/algeria');
    expect(screen.getByRole('navigation')).toBeTruthy();
  });

  it('keeps the plain empty state for a market with nothing on at all', () => {
    render(<DiscoverFeed locale="en" market={market} events={[]} />);

    expect(
      screen.getByRole('heading', {
        name: no_events_yet({}, { locale: 'en' }),
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('tells a filtered city page it has none of that type, not to host the first meetup', () => {
    render(
      <CityLanding
        locale="en"
        market={market}
        city={oran}
        events={[]}
        type="workshop"
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: event_type_empty({}, { locale: 'en' }),
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', {
        name: city_empty_title(cityInputs('Oran'), { locale: 'en' }),
      }),
    ).toBeNull();
    expect(
      screen
        .getByRole('link', { name: event_type_show_all({}, { locale: 'en' }) })
        .getAttribute('href'),
    ).toBe('/en/algeria/oran');
  });
});
