import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { hackathon_organisers_apply, type Locale } from '@founders-coffee/i18n';

import { HackathonOrganisers } from './HackathonOrganisers';

afterEach(cleanup);

const renderSection = async (locale: Locale, isEnabled = true) => {
  const root = createRootRoute();
  const localized = createRoute({
    getParentRoute: () => root,
    path: '$locale',
  });
  const home = createRoute({
    getParentRoute: () => localized,
    path: '$market',
    component: () => (
      <HackathonOrganisers locale={locale} isEnabled={isEnabled} />
    ),
  });
  const organisations = createRoute({
    getParentRoute: () => localized,
    path: 'profile/organisations',
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([localized.addChildren([home, organisations])]),
    history: createMemoryHistory({ initialEntries: [`/${locale}/algeria`] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
};

describe.each(['ar', 'en', 'fr'] as const)(
  'organiser entry points in %s',
  (locale) => {
    it('takes an organiser to their organisations page', async () => {
      const router = await renderSection(locale);
      expect(await screen.findAllByRole('link')).toHaveLength(1);
      fireEvent.click(
        await screen.findByRole('link', {
          name: hackathon_organisers_apply({}, { locale }),
        }),
      );
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(
          `/${locale}/profile/organisations`,
        ),
      );
    });

    it('does not offer hackathon setup in a disabled market', async () => {
      await renderSection(locale, false);
      expect(screen.queryByRole('region')).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
    });
  },
);
