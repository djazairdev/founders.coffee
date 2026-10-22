import { cleanup, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Market } from '@founders-coffee/db';
import type { Locale } from '@founders-coffee/i18n';

import type { MarketHackathon } from '../api';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    params,
  }: {
    children: ReactNode;
    className?: string;
    params: { slug: string };
  }) => createElement('a', { href: `/e/${params.slug}`, className }, children),
}));

const { MarketHackathons } = await import('./MarketHackathons');

const DAY = 86_400_000;
const KICKOFF = Date.UTC(2099, 0, 22, 9);

const market = (hackathons: boolean): Market => ({
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
    hackathons,
    payments: false,
    recruiting: false,
  },
});

const hackathon: MarketHackathon = {
  id: 'evt_builders',
  slug: 'algiers-builders',
  title: 'Algiers Builders Hackathon',
  schedule: {
    registrationOpensAt: KICKOFF - 18 * DAY,
    registrationClosesAt: KICKOFF - DAY,
    kickoffAt: KICKOFF,
    submissionDeadlineAt: KICKOFF + 7 * DAY,
    endsAt: KICKOFF + 8 * DAY,
    judgingEndsAt: KICKOFF + 15 * DAY,
    phase: 'registration_open',
  },
};

const renderSection = ({
  hackathons = [hackathon],
  isOn = true,
  isAnnounced = false,
  locale = 'en',
}: {
  hackathons?: readonly MarketHackathon[];
  isOn?: boolean;
  isAnnounced?: boolean;
  locale?: Locale;
} = {}) =>
  render(
    <MarketHackathons
      locale={locale}
      market={market(isOn)}
      hackathons={hackathons}
      isAnnounced={isAnnounced}
    />,
  );

afterEach(cleanup);

describe('MarketHackathons (B-HKN-20)', () => {
  it('lists each hackathon with its phase and dates, linked to its page', () => {
    renderSection();

    expect(
      screen.getByRole('heading', { name: 'Hackathons', level: 2 }),
    ).toBeTruthy();
    const link = screen.getByRole('link', {
      name: /Algiers Builders Hackathon/,
    });
    expect(link.getAttribute('href')).toBe('/e/algiers-builders');
    expect(link.textContent).toContain('Registration is open until');
    expect(link.textContent).toContain('Kickoff Thu, Jan 22');
    expect(link.textContent).toContain('Demo day Fri, Jan 30');
  });

  it('says none is coming up, unless the announcement already covers it', () => {
    renderSection({ hackathons: [] });
    expect(
      screen.getByText('No hackathon is coming up here yet.'),
    ).toBeTruthy();
    cleanup();

    const { container } = renderSection({ hackathons: [], isAnnounced: true });
    expect(container.innerHTML).toBe('');
  });

  it('keeps the list beside the announcement', () => {
    renderSection({ isAnnounced: true });
    expect(screen.getByRole('link')).toBeTruthy();
  });

  it('shows nothing where the market has hackathons off', () => {
    const { container } = renderSection({ isOn: false });
    expect(container.innerHTML).toBe('');
  });

  it('reads in Arabic', () => {
    renderSection({ locale: 'ar' });
    expect(
      screen.getByRole('heading', { name: 'الهاكاثونات', level: 2 }),
    ).toBeTruthy();
    expect(screen.getByRole('link').textContent).toContain('التسجيل مفتوح حتى');
  });
});
