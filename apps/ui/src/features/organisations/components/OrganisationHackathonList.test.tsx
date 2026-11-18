import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { OrganisationHackathon } from '../types';
import { OrganisationHackathonList } from './OrganisationHackathonList';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode;
    to: string;
    params: Record<string, string>;
  }) => (
    <a
      href={Object.entries(params).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
    >
      {children}
    </a>
  ),
}));

const draft: OrganisationHackathon = {
  id: 'evt_draft',
  title: 'Autumn build weekend',
  cityCode: '31',
  startsAt: new Date('2099-11-12T08:00:00Z'),
  endsAt: new Date('2099-11-14T17:00:00Z'),
  status: 'draft',
};

const renderList = ({
  hackathons = [draft],
  canCreate = true,
  locale = 'en',
}: {
  hackathons?: readonly OrganisationHackathon[];
  canCreate?: boolean;
  locale?: Locale;
} = {}) =>
  render(
    <OrganisationHackathonList
      slug="oran-makers"
      hackathons={hackathons}
      canCreate={canCreate}
      locale={locale}
      timeZone="Africa/Algiers"
    />,
  );

describe('OrganisationHackathonList (B-HKN-11)', () => {
  afterEach(cleanup);

  it('lists the hackathons with their status and dates, and offers a new one', () => {
    renderList();

    expect(screen.getByRole('heading', { name: 'Hackathons' })).toBeTruthy();
    expect(screen.getByText('Autumn build weekend')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(
      screen.getByText('November 12, 2099 to November 14, 2099'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Create a hackathon' })
        .getAttribute('href'),
    ).toBe('/en/o/oran-makers/hackathons/new');
  });

  it('links each hackathon to the page its organisers manage it on', () => {
    renderList();

    expect(
      screen.getByRole('link', { name: 'Manage' }).getAttribute('href'),
    ).toBe('/en/hackathon/evt_draft/manage');
  });

  it('says when there are none yet, and offers nothing to create without the right', () => {
    renderList({ hackathons: [], canCreate: false });

    expect(screen.getByText('No hackathons yet.')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows a hackathon with no end date by its start alone', () => {
    renderList({
      hackathons: [{ ...draft, endsAt: null, status: 'published' }],
    });

    expect(screen.getByText('Published')).toBeTruthy();
    expect(screen.getByText('November 12, 2099')).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderList({ locale: 'ar' });

    expect(screen.getByRole('heading', { name: 'الهاكاثونات' })).toBeTruthy();
    expect(screen.getByText('مسودة')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'إنشاء هاكاثون' })).toBeTruthy();
  });
});
