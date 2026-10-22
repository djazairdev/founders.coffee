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
  rules: {
    rules: 'Build during the weekend.\nShip something that runs.',
    minimumAge: 18,
    attendanceModes: ['in_person', 'online'],
    teamMin: 2,
    teamMax: 5,
    aiPolicy: 'restricted',
    aiPolicyNote: 'No generated code in the core logic.',
    licenceNote: 'Teams keep what they build.',
  },
  judges: [
    { userId: 'usr_amina', name: 'Amina Kaci', photoAssetId: null },
    { userId: 'usr_yacine', name: 'Yacine B.', photoAssetId: 'pa_1' },
  ],
  mentors: [],
  workshops: [],
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

const valueOf = (rules: HTMLElement, label: string) =>
  within(rules).getByText(label).nextElementSibling?.textContent;

afterEach(cleanup);

describe('HackathonPageDetails (B-HKN-19, B-HKN-26)', () => {
  it('states the rules, eligibility, team size, AI policy and licence', () => {
    renderDetails(details());

    const rules = screen.getByRole('region', { name: 'Rules and eligibility' });
    expect(valueOf(rules, 'Who can take part')).toBe(
      'Teams have 2 to 5 people.',
    );
    expect(valueOf(rules, 'How people take part')).toBe('In person · Online');
    expect(valueOf(rules, 'Minimum age')).toBe('18');
    expect(valueOf(rules, 'AI policy')).toContain('Restricted');
    expect(valueOf(rules, 'AI policy')).toContain(
      'No generated code in the core logic.',
    );
    expect(valueOf(rules, 'Rules')).toContain('Ship something that runs.');
    expect(valueOf(rules, 'Licence and ownership')).toBe(
      'Teams keep what they build.',
    );
  });

  it('says there is no minimum age, and leaves out rules and licence never written', () => {
    renderDetails(
      details({
        rules: {
          ...details().rules,
          minimumAge: null,
          rules: null,
          licenceNote: null,
          aiPolicyNote: null,
        },
      }),
    );

    const rules = screen.getByRole('region', { name: 'Rules and eligibility' });
    expect(valueOf(rules, 'Minimum age')).toBe('None');
    expect(within(rules).queryByText('Rules')).toBeNull();
    expect(within(rules).queryByText('Licence and ownership')).toBeNull();
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
      screen.getByRole('region', { name: 'القواعد وشروط المشاركة' }),
    ).toBeTruthy();
    expect(screen.getByRole('region', { name: 'الحكام' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Amina Kaci/u }).getAttribute('href'),
    ).toBe('/ar/u/usr_amina');
  });
});
