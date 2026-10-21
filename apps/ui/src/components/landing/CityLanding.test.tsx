import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import {
  hackathon_announce_title,
  back_to_market,
  hero_empty_cta,
  city_empty_title,
  city_events_description,
  city_upcoming_title,
  cityInputs,
  clear_city_filters,
  filter_today,
  host_meetup_here,
  LOCALES,
  no_filter_match,
  type Locale,
} from '@founders-coffee/i18n';

import { CityLanding } from './CityLanding';
import { market, meetup, oran, oranByLocale } from './city-landing.fixtures';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => createElement('a', { href: '/', className }, children),
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

const event = meetup();

const cairo: geo.GeoCity = {
  code: '397',
  name: 'Cairo',
  nameAr: 'القاهرة',
  nameFr: 'Le Caire',
  slug: 'cairo',
  stateCode: '1',
  featured: true,
};

const egypt: Market = {
  ...market,
  code: 'EG',
  name: 'Egypt',
  nameAr: 'مصر',
  nameFr: 'Égypte',
  slug: 'egypt',
  defaultCurrency: 'EGP',
  timezone: 'Africa/Cairo',
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('city page', () => {
  it.each<Locale>(LOCALES)(
    'heads a city with nothing on by its name and invites a host beneath it in %s',
    (locale) => {
      const city = oranByLocale[locale];
      render(
        <CityLanding locale={locale} market={market} city={oran} events={[]} />,
      );

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(city);
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: city_empty_title(cityInputs(city), { locale }),
        }),
      ).toBeTruthy();
    },
  );

  it('writes au Caire in French, where the article of Le Caire merges into à', () => {
    const { unmount } = render(
      <CityLanding locale="fr" market={egypt} city={cairo} events={[]} />,
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Soyez le premier à organiser une rencontre d’entrepreneurs au Caire',
      }),
    ).toBeTruthy();
    unmount();

    render(
      <CityLanding
        locale="fr"
        market={egypt}
        city={cairo}
        events={[{ ...event, marketCode: 'EG', cityCode: cairo.code }]}
      />,
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Prochaines rencontres au Caire',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Découvrez les prochaines rencontres d’entrepreneurs et de la communauté au Caire.',
      ),
    ).toBeTruthy();
  });

  it('announces the first hackathon under the header of an Algerian city', () => {
    vi.useFakeTimers({
      now: new Date('2026-10-21T10:00:00Z'),
      toFake: ['Date'],
    });
    render(
      <CityLanding locale="en" market={market} city={oran} events={[event]} />,
    );

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      hackathon_announce_title({}, { locale: 'en' }),
      city_upcoming_title(cityInputs('Oran'), { locale: 'en' }),
    ]);
  });

  it('gives a city with nothing on one way to host and one way back', () => {
    render(<CityLanding locale="en" market={market} city={oran} events={[]} />);

    expect(
      screen.getAllByRole('link', {
        name: hero_empty_cta({}, { locale: 'en' }),
      }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('link', {
        name: host_meetup_here({}, { locale: 'en' }),
      }),
    ).toBeNull();
    expect(
      screen.getAllByRole('link', {
        name: back_to_market({ market: 'Algeria' }, { locale: 'en' }),
      }),
    ).toHaveLength(1);
    expect(
      screen.queryByText(
        city_events_description(cityInputs('Oran'), { locale: 'en' }),
      ),
    ).toBeNull();
  });

  it('keeps the description and the host button above a city with meetups', () => {
    render(
      <CityLanding locale="en" market={market} city={oran} events={[event]} />,
    );

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Oran');
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: city_upcoming_title(cityInputs('Oran'), { locale: 'en' }),
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        city_events_description(cityInputs('Oran'), { locale: 'en' }),
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByRole('link', {
        name: host_meetup_here({}, { locale: 'en' }),
      }),
    ).toHaveLength(1);
  });

  it.each<Locale>(LOCALES)(
    'says nothing matches when the chips leave no meetup, until they are cleared, in %s',
    (locale) => {
      const meetups = {
        name: city_upcoming_title(cityInputs(oranByLocale[locale]), {
          locale,
        }),
      };
      const nothingMatches = {
        level: 2,
        name: no_filter_match({}, { locale }),
      };
      render(
        <CityLanding
          locale={locale}
          market={market}
          city={oran}
          events={[event]}
        />,
      );

      fireEvent.click(
        screen.getByRole('button', { name: filter_today({}, { locale }) }),
      );

      expect(screen.queryByRole('list', meetups)).toBeNull();
      expect(screen.getByRole('heading', nothingMatches)).toBeTruthy();

      fireEvent.click(
        screen.getByRole('button', {
          name: clear_city_filters({}, { locale }),
        }),
      );

      expect(screen.getByRole('list', meetups)).toBeTruthy();
      expect(screen.queryByRole('heading', nothingMatches)).toBeNull();
    },
  );
});
