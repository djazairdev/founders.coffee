import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Market } from '@founders-coffee/db';
import type { Locale } from '@founders-coffee/i18n';

import type { HackathonPageDetails as Details } from '../api';
import { HackathonPageDetails } from './HackathonPageDetails';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    to,
    params,
  }: {
    children: ReactNode;
    className?: string;
    to: string;
    params: Record<string, string>;
  }) => (
    <a
      href={Object.entries(params).reduce(
        (href, [key, value]) => href.replace(`$${key}`, value),
        to,
      )}
      className={className}
    >
      {children}
    </a>
  ),
}));

const details = (changes: Partial<Details> = {}): Details => ({
  tracks: [],
  prizes: [],
  results: null,
  rules: {
    rules: 'Build during the weekend.\nShip something that runs.',
    minimumAge: 18,
    attendanceModes: ['in_person', 'online'],
    teamMin: 2,
    teamMax: 5,
    aiPolicy: 'conditional',
    aiPolicyNote: 'No generated code in the core logic.',
    licenceNote: 'Teams keep what they build.',
  },
  judges: [
    { userId: 'usr_amina', name: 'Amina Kaci', photoAssetId: null },
    { userId: 'usr_yacine', name: 'Yacine B.', photoAssetId: 'pa_1' },
  ],
  mentors: [],
  workshops: [],
  registration: null,
  ...changes,
});

const market: Market = {
  code: 'DZ',
  name: 'Algeria',
  nameAr: 'الجزائر',
  nameFr: 'Algérie',
  slug: 'algeria',
  defaultLocale: 'ar',
  defaultCurrency: 'DZD',
  timezone: 'Africa/Algiers',
  direction: 'rtl',
  state: 'active',
  brandOverrides: null,
  createdAt: 0,
  featureFlags: {
    events: true,
    hackathons: true,
    payments: false,
    recruiting: false,
  },
};

const mentors: Details['mentors'] = [
  {
    userId: 'usr_lina',
    name: 'Lina H.',
    photoAssetId: null,
    helpsWith: 'Pitching and fundraising',
    officeHours: 'Tuesdays 18:00–20:00 in the chat',
  },
  {
    userId: 'usr_omar',
    name: 'Omar S.',
    photoAssetId: null,
    helpsWith: 'Databases',
    officeHours: null,
  },
];

const workshops: Details['workshops'] = [
  {
    id: 'evt_git',
    slug: 'git-for-teams',
    title: 'Git for teams',
    format: 'online',
    startsAt: new Date('2099-01-14T17:00:00Z'),
  },
];

const renderDetails = (value: Details, locale: Locale = 'en') =>
  render(
    <HackathonPageDetails details={value} market={market} locale={locale} />,
  );

afterEach(cleanup);

describe('HackathonPageDetails (B-HKN-19, B-HKN-26)', () => {
  it('hides rules and eligibility on the public page', () => {
    renderDetails(details());

    expect(
      screen.queryByRole('region', { name: 'Rules and eligibility' }),
    ).toBeNull();
  });

  it('orders tracks, prizes, and judges by participant priority', () => {
    renderDetails(
      details({
        tracks: [
          {
            id: 'trk_build',
            kind: 'founder_problem',
            title: 'Build for local teams',
            brief: 'Make a tool for the community.',
            partnerName: null,
            sourceUrls: [],
          },
        ],
        prizes: [
          {
            id: 'prz_first',
            trackId: null,
            place: 1,
            title: 'First place',
            description: 'A laptop',
            providerName: null,
            value: null,
          },
        ],
      }),
    );
    const tracks = screen.getByRole('region', { name: 'Tracks' });
    const prizes = screen.getByRole('region', { name: 'Prizes' });
    const judges = screen.getByRole('region', { name: 'Judges' });

    expect(
      tracks.compareDocumentPosition(prizes) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      prizes.compareDocumentPosition(judges) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('links each judge who accepted to their profile', () => {
    renderDetails(details());

    const judges = screen.getByRole('region', { name: 'Judges' });
    expect(
      within(judges)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['AAmina Kaci', '/en/u/usr_amina'],
      ['Yacine B.', '/en/u/usr_yacine'],
    ]);
    expect(judges.querySelector('img')?.getAttribute('src')).toBe(
      '/media/profile/pa_1/sm',
    );
  });

  it('shows no judges section before any judge accepted', () => {
    renderDetails(details({ judges: [] }));

    expect(screen.queryByRole('region', { name: 'Judges' })).toBeNull();
  });

  it('links each mentor to their profile, with what they help with and when', () => {
    renderDetails(details({ mentors }));

    const section = screen.getByRole('region', { name: 'Mentors' });
    expect(
      within(section)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/en/u/usr_lina', '/en/u/usr_omar']);
    expect(within(section).getAllByText('Helps with')).toHaveLength(2);
    expect(
      within(section).getByText('Tuesdays 18:00–20:00 in the chat'),
    ).toBeTruthy();
    expect(within(section).getAllByText('Office hours')).toHaveLength(1);
  });

  it('links the workshops before kickoff, with their time in the market and format', () => {
    renderDetails(details({ workshops }));

    const link = within(
      screen.getByRole('region', { name: 'Workshops before kickoff' }),
    ).getByRole('link');
    expect(link.getAttribute('href')).toBe('/en/algeria/e/git-for-teams');
    expect(link.textContent).toContain('Git for teams');
    expect(link.textContent).toContain('18:00');
    expect(link.textContent).toContain('Online');
  });

  it('shows no mentors or workshops section while there are none', () => {
    renderDetails(details());

    expect(screen.queryByRole('region', { name: 'Mentors' })).toBeNull();
    expect(
      screen.queryByRole('region', { name: 'Workshops before kickoff' }),
    ).toBeNull();
  });

  it('reads in Arabic', () => {
    renderDetails(details({ mentors, workshops }), 'ar');

    expect(screen.getByRole('region', { name: 'المرشدون' })).toBeTruthy();
    expect(
      screen.getByRole('region', { name: 'ورشات قبل الانطلاق' }),
    ).toBeTruthy();

    expect(
      screen.queryByRole('region', { name: 'القواعد وشروط المشاركة' }),
    ).toBeNull();
    expect(screen.getByRole('region', { name: 'الحكام' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Amina Kaci/u }).getAttribute('href'),
    ).toBe('/ar/u/usr_amina');
  });
});
