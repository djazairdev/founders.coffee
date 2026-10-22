import { cleanup, render } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';

import '../../../components/host/HostCreatePage.map.fixtures';
import { viewWith } from '../../organisations/my-organisation.fixtures';
import type { OrganisationRoster } from '../../organisations/types';
import { HackathonCreatePage } from './HackathonCreatePage';

export const KICKOFF = new Date('2099-03-12T08:00:00Z').getTime();
export const DEMO_DAY = new Date('2099-03-14T17:00:00Z').getTime();

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  mutate: vi.fn(),
  reset: vi.fn(),
  save: {
    isPending: false,
    isError: false,
    error: null as unknown,
  },
}));

export const getHackathonCreateMocks = () => mocks;

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({
    children,
    'aria-label': label,
    className,
  }: {
    children: ReactNode;
    'aria-label'?: string;
    className?: string;
  }) =>
    createElement('a', { href: '#', 'aria-label': label, className }, children),
}));

vi.mock('../hooks', () => ({
  useCreateHackathonDraft: () => ({
    mutate: mocks.mutate,
    reset: mocks.reset,
    ...mocks.save,
  }),
}));

vi.mock('../../events/hooks', () => ({
  useHostMapContext: () => ({
    data: {
      center: { latitude: 36.7538, longitude: 3.0588 },
      bounds: [2.9, 36.6, 3.3, 36.9],
    },
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useIsLocatingVenue: () => false,
  useNearbyVenues: () => ({ data: [], isPending: false }),
  useVenueSearch: () => ({
    data: [],
    error: null,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../geo/hooks', () => ({
  useCitySuggestions: () => ({ data: [] }),
  useMarketStates: () => ({
    data: [{ code: '16', name: 'Algiers', nameAr: 'الجزائر', nameFr: 'Alger' }],
  }),
  useStateCities: () => ({
    data: [
      {
        code: '1',
        stateCode: '16',
        name: 'Algiers',
        nameAr: 'الجزائر',
        nameFr: 'Alger',
      },
    ],
  }),
}));

vi.mock('../../../components/host/ClientOnly', () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../../../components/host/VenueSearch', () => ({
  VenueSearch: () => createElement('input', { id: 'venue-search' }),
}));

vi.mock('./HackathonScheduleStep', () => ({
  HackathonScheduleStep: ({
    onChange,
    error,
  }: {
    onChange: (startsAt: number, endsAt: number) => void;
    error?: string;
  }) =>
    createElement('div', { id: 'host-calendar', tabIndex: -1 }, [
      createElement(
        'button',
        { key: 'set', onClick: () => onChange(KICKOFF, DEMO_DAY) },
        'Set schedule',
      ),
      error ? createElement('p', { key: 'error' }, error) : null,
    ]),
}));

const market = {
  code: 'DZ',
  slug: 'algeria',
  timezone: 'Africa/Algiers',
  name: 'Algeria',
  nameAr: 'الجزائر',
  nameFr: 'Algérie',
} as never;

const city = {
  code: '1',
  stateCode: '16',
  name: 'Algiers',
  nameAr: 'الجزائر',
  nameFr: 'Alger',
} as never;

/** Render the wizard for the fixture organisation, or for one changed as the test needs. */
export const renderHackathonWizard = (
  locale: 'ar' | 'fr' | 'en' = 'en',
  organisation: Partial<OrganisationRoster> = {},
) =>
  render(
    createElement(HackathonCreatePage, {
      locale,
      organisation: viewWith(organisation),
      market,
      city,
      mapboxToken: 'map-token',
    }),
  );

export const resetHackathonWizard = () => {
  cleanup();
  vi.clearAllMocks();
  mocks.save.isPending = false;
  mocks.save.isError = false;
  mocks.save.error = null;
};
