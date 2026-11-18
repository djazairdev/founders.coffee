import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { PublicProfile } from '../api';
import { PublicProfileProjects } from './PublicProfileProjects';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    params,
    children,
  }: {
    params: { locale: string; slug: string };
    children: ReactNode;
  }) => <a href={`/${params.locale}/p/${params.slug}`}>{children}</a>,
}));

const LEDGER = {
  slug: 'ledger-ab12',
  title: 'Ledger',
  stage: 'launched' as const,
  hackathonTitle: 'Algiers Builders',
  rank: 1,
  trackRank: 1,
};

const show = (projects: PublicProfile['projects'], locale: Locale = 'en') =>
  render(
    <PublicProfileProjects
      locale={locale}
      profile={{ projects } as PublicProfile}
    />,
  );

afterEach(cleanup);

describe('PublicProfileProjects (B-PRJ-05)', () => {
  it('shows nothing without a project', () => {
    const { container } = show([]);
    expect(container.innerHTML).toBe('');
  });

  it('links each project and says its stage, hackathon and rank', () => {
    show([LEDGER]);

    expect(screen.getByRole('heading', { name: 'Projects' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Ledger' }).getAttribute('href'),
    ).toBe('/en/p/ledger-ab12');
    expect(screen.getByRole('listitem').textContent).toBe(
      'LedgerLaunched · Algiers Builders · Rank 1',
    );
  });

  it('falls back to the track rank, then to no result', () => {
    show([
      { ...LEDGER, rank: null, trackRank: 2 },
      {
        ...LEDGER,
        slug: 'other-cd34',
        hackathonTitle: null,
        rank: null,
        trackRank: null,
      },
    ]);

    const [first, second] = screen.getAllByRole('listitem');
    expect(first?.textContent).toContain('Track rank 2');
    expect(second?.textContent).toBe('LedgerLaunched');
  });

  it.each<Locale>(['ar', 'fr'])('has its copy in %s', (locale) => {
    show([LEDGER], locale);
    expect(screen.getByRole('heading').textContent).not.toBe('Projects');
  });
});
