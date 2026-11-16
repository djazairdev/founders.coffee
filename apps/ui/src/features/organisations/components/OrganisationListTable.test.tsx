import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { OrganisationView } from '../api';
import { OrganisationListTable } from './OrganisationListTable';

const organisationAt = (
  index: number,
  status: OrganisationView['status'] = 'approved',
): OrganisationView => ({
  id: `org_${String(index).padStart(32, '0')}`,
  name: `QA Organisation ${index}`,
  slug: `qa-organisation-${index}`,
  kind: 'club',
  status,
  marketCode: 'DZ',
  cityCode: null,
  description: 'A local organisation for checking table pagination.',
  websiteUrl: null,
  logo: null,
  createdAt: new Date('2026-11-13T10:00:00Z'),
  role: 'owner',
  canEdit: true,
  canDelete: true,
});

const renderTable = async (data: readonly OrganisationView[]) => {
  const rootRoute = createRootRoute();
  const organisationsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$locale/profile/organisations',
    component: () => (
      <OrganisationListTable
        data={data}
        locale="en"
        onDelete={() => undefined}
        onEdit={() => undefined}
      />
    ),
  });
  const hackathonRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$locale/o/$slug/hackathons/new',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([organisationsRoute, hackathonRoute]),
    history: createMemoryHistory({
      initialEntries: ['/en/profile/organisations'],
    }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
};

describe('OrganisationListTable', () => {
  afterEach(() => cleanup());

  it('shows ten organisations per page and reaches the remaining row', async () => {
    await renderTable(
      Array.from({ length: 11 }, (_, index) => organisationAt(index + 1)),
    );

    expect(screen.queryByText('QA Organisation 1')).not.toBeNull();
    expect(screen.queryByText('QA Organisation 11')).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Type' })).toBeNull();
    expect(
      screen.getAllByRole('link', { name: 'Create a hackathon' }).length,
    ).toBe(10);
    const firstHackathonLink = screen.getAllByRole('link', {
      name: 'Create a hackathon',
    })[0];
    expect(firstHackathonLink?.getAttribute('href')).toBe(
      '/en/o/qa-organisation-1/hackathons/new',
    );
    expect(firstHackathonLink?.className).toContain('btn-outline');
    expect(
      screen.getAllByRole('button', { name: 'Edit profile' })[0]?.className,
    ).toContain('btn-circle');
    expect(
      screen.getAllByRole('button', { name: 'Delete organisation' })[0]
        ?.className,
    ).toContain('btn-circle');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.queryByText('QA Organisation 11')).not.toBeNull();
    expect(screen.queryByText('Page 2 of 2')).not.toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Create a hackathon' })
        .getAttribute('href'),
    ).toBe('/en/o/qa-organisation-11/hackathons/new');
  });

  it('offers hackathon creation only for active organisations', async () => {
    await renderTable([organisationAt(1, 'pending')]);

    expect(
      screen.queryByRole('link', { name: 'Create a hackathon' }),
    ).toBeNull();
  });
});
