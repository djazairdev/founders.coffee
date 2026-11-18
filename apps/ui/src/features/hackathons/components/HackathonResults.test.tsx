import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonPublicResult, HackathonPublicResults } from '../api';
import { HackathonResults } from './HackathonResults';

afterEach(cleanup);

const entry = (
  title: string,
  rank: number | null,
  changes: Partial<HackathonPublicResult> = {},
): HackathonPublicResult => ({
  submissionId: `sub_${title}`,
  teamName: `${title} team`,
  title,
  trackId: 'trk_pay',
  trackTitle: 'Payments',
  total: rank === null ? null : 87.5,
  rank,
  trackRank: rank,
  tieNote: null,
  isDisqualified: false,
  criteria: [
    {
      criterionId: 'crt_impact',
      name: 'Impact',
      scale: 10,
      mean: rank === null ? null : 8.25,
    },
  ],
  pullRequests: [],
  ...changes,
});

const ledger = entry('Ledger', 1, {
  tieNote: 'organiser_pick',
  pullRequests: [
    { url: 'https://github.com/acme/ledger/pull/7', status: 'merged' },
  ],
});

const shown: HackathonPublicResults = {
  winners: [
    {
      prizeId: 'prz_first',
      place: 1,
      prizeTitle: 'First prize',
      trackTitle: null,
      title: 'Ledger',
      teamName: 'Ledger team',
      isDisqualified: false,
    },
    {
      prizeId: 'prz_track',
      place: 1,
      prizeTitle: 'Payments prize',
      trackTitle: 'Payments',
      title: 'Ledger',
      teamName: 'Ledger team',
      isDisqualified: false,
    },
  ],
  overall: [ledger, entry('Souk', null)],
  tracks: [{ trackId: 'trk_pay', title: 'Payments', entries: [ledger] }],
};

const renderResults = (locale: Locale = 'en') =>
  render(<HackathonResults results={shown} locale={locale} />);

describe('HackathonResults (B-JDG-10)', () => {
  it('names the winner of each prize', () => {
    renderResults();

    expect(screen.getByRole('heading', { name: 'Winners' })).toBeTruthy();
    expect(screen.getByText('First prize')).toBeTruthy();
    expect(screen.getByText('Payments prize')).toBeTruthy();
    expect(screen.getByText(/Whole hackathon/u)).toBeTruthy();
  });

  it('offers a member, and nobody else, a report on each entry that still stands', () => {
    renderResults();
    expect(screen.queryByRole('button', { name: /^Report / })).toBeNull();
    cleanup();

    const [first, ...rest] = shown.overall;
    render(
      <HackathonResults
        results={
          {
            ...shown,
            overall: [{ ...first, isDisqualified: true }, ...rest],
          } as typeof shown
        }
        reportEventId="evt_1"
        locale="en"
      />,
    );

    expect(screen.getAllByRole('button', { name: /^Report / })).toHaveLength(
      rest.length,
    );
  });

  it('leaves the winners out when no prize has one', () => {
    render(
      <HackathonResults results={{ ...shown, winners: [] }} locale="en" />,
    );

    expect(screen.queryByRole('heading', { name: 'Winners' })).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Overall ranking' }),
    ).toBeTruthy();
  });

  it('ranks entries overall with each criterion’s score, the unranked last', () => {
    renderResults();

    const overall = screen.getByRole('heading', { name: 'Overall ranking' })
      .parentElement as HTMLElement;
    expect(within(overall).getByText('Rank 1')).toBeTruthy();
    expect(within(overall).getByText('87.5 / 100')).toBeTruthy();
    expect(overall.textContent).toContain('Impact: 8.25 / 10');
    expect(
      within(overall).getByText('Tie settled by the organiser.'),
    ).toBeTruthy();
    expect(within(overall).getByText('Not ranked')).toBeTruthy();
  });

  it('renders no empty list for an entry with no scores (#474)', () => {
    const { container } = render(
      <HackathonResults results={shown} locale="en" />,
    );

    expect(screen.getAllByText('Not ranked').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('ul:empty')).toHaveLength(0);
  });

  it('ranks entries within each track, without repeating the details', () => {
    renderResults();

    const tracks = screen.getByRole('heading', { name: 'Ranking by track' })
      .parentElement as HTMLElement;
    expect(within(tracks).getByText('Payments')).toBeTruthy();
    expect(within(tracks).getByText('Rank 1')).toBeTruthy();
    expect(tracks.textContent).not.toContain('Impact');
  });

  it('keeps a criterion’s name apart from its score, whatever its script', () => {
    renderResults();

    const name = screen.getAllByText('Impact')[0] as HTMLElement;
    expect(name.tagName).toBe('BDI');
  });

  it('shows a pull request with where it stands, opening safely', () => {
    renderResults();

    const link = screen.getByRole('link', {
      name: 'github.com/acme/ledger/pull/7',
    });
    expect(link.getAttribute('href')).toBe(
      'https://github.com/acme/ledger/pull/7',
    );
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('Merged')).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderResults('ar');

    expect(screen.getByRole('heading', { name: 'الفائزون' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'الترتيب العام' })).toBeTruthy();
  });

  it('marks an entry disqualified after the results, in the ranking and among the winners', () => {
    const marked = { ...ledger, isDisqualified: true };
    render(
      <HackathonResults
        locale="en"
        results={{
          ...shown,
          winners: [
            {
              ...(shown.winners[0] as (typeof shown.winners)[number]),
              isDisqualified: true,
            },
          ],
          overall: [marked],
          tracks: [],
        }}
      />,
    );

    expect(screen.getAllByText('Disqualified after the results.')).toHaveLength(
      2,
    );
    expect(screen.getByText('Rank 1')).toBeTruthy();
  });
});
