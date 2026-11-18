import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { landingSearchSchema } from '../../lib/event-type-filter';
import { parseSearch, stringifySearch } from '../../lib/search-params';
import { EventTypeEmpty } from './EventTypeEmpty';
import { EventTypeFilter } from './EventTypeFilter';

const TYPES = ['meetup', 'workshop'] as const;

const renderAt = async (path: string) => {
  const rootRoute = createRootRoute();
  const localeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$locale',
  });
  const marketRoute = createRoute({
    getParentRoute: () => localeRoute,
    path: '$market',
  });
  const landingRoute = createRoute({
    getParentRoute: () => marketRoute,
    path: '/',
    validateSearch: landingSearchSchema,
    component: () => {
      const { type } = landingRoute.useSearch();
      return (
        <>
          <EventTypeFilter
            locale="en"
            marketSlug="algeria"
            types={TYPES}
            active={type}
          />
          {type ? <EventTypeEmpty locale="en" marketSlug="algeria" /> : null}
        </>
      );
    },
  });
  const cityRoute = createRoute({
    getParentRoute: () => marketRoute,
    path: '$city',
    validateSearch: landingSearchSchema,
    component: () => {
      const { type } = cityRoute.useSearch();
      return (
        <>
          <EventTypeFilter
            locale="en"
            marketSlug="algeria"
            citySlug="algiers"
            types={TYPES}
            active={type}
          />
          {type ? (
            <EventTypeEmpty
              locale="en"
              marketSlug="algeria"
              citySlug="algiers"
            />
          ) : null}
        </>
      );
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      localeRoute.addChildren([
        marketRoute.addChildren([landingRoute, cityRoute]),
      ]),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
    parseSearch,
    stringifySearch,
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByRole('navigation');
};

const current = () =>
  screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent);

afterEach(cleanup);

describe('which type link is current, under the real router (B-EVT-05)', () => {
  it.each([
    ['/en/algeria', ['All']],
    ['/en/algeria?type=workshop', ['Workshops']],
    ['/en/algeria/algiers', ['All']],
    ['/en/algeria/algiers?type=meetup', ['Meetups']],
  ])('on %s, only %j', async (path, expected) => {
    await renderAt(path);

    expect(current()).toEqual(expected);
  });

  it('never marks the way back to every event as the current page', async () => {
    await renderAt('/en/algeria/algiers?type=meetup');

    const showAll = screen.getByRole('link', { name: 'See every event' });
    expect(showAll.getAttribute('aria-current')).toBeNull();
    expect(showAll.getAttribute('href')).toBe('/en/algeria/algiers');
    expect(
      within(screen.getByRole('navigation'))
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/en/algeria/algiers',
      '/en/algeria/algiers?type=meetup',
      '/en/algeria/algiers?type=workshop',
    ]);
  });
});
