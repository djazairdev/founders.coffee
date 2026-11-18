import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonOffer as Offer } from '../api';
import { HackathonOffer } from './HackathonOffer';

const offer: Offer = {
  tracks: [
    {
      id: 'trk_shops',
      kind: 'founder_problem',
      title: 'Payments for corner shops',
      brief: 'A ledger a corner shop keeps on its phone.\nNo bank needed.',
      partnerName: null,
      sourceUrls: [],
    },
    {
      id: 'trk_oss',
      kind: 'open_source',
      title: 'Open source',
      brief: 'Fix an issue in a project Algerian teams use.',
      partnerName: 'Djazair Dev',
      sourceUrls: ['https://github.com/djazairdev/founders.coffee'],
    },
  ],
  prizes: [
    {
      id: 'prz_overall',
      trackId: null,
      place: 1,
      title: 'Cloud credits',
      description: 'Credits for a year.',
      providerName: 'Algiers Builders',
      value: { amount_minor: 5_000_000, currency: 'DZD' },
    },
    {
      id: 'prz_oss',
      trackId: 'trk_oss',
      place: 2,
      title: 'Mentoring',
      description: 'Four hours with a maintainer.',
      providerName: 'Djazair Dev',
      value: null,
    },
  ],
};

const renderOffer = (value: Offer, locale: Locale = 'en') =>
  render(<HackathonOffer offer={value} locale={locale} />);

afterEach(cleanup);

describe('HackathonOffer (B-HKN-18)', () => {
  it('lists the tracks with their kind, partner, brief and links', () => {
    renderOffer(offer);

    const tracks = screen.getByRole('region', { name: 'Tracks' });
    expect(
      within(tracks)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Payments for corner shops', 'Open source']);
    expect(within(tracks).getByText('A founder’s problem')).toBeTruthy();
    expect(within(tracks).getByText('Partner: Djazair Dev')).toBeTruthy();
    expect(within(tracks).getByText(/^A ledger a corner shop/u)).toBeTruthy();
    const link = within(tracks).getByRole('link', {
      name: 'github.com/djazairdev/founders.coffee',
    });
    expect(link.getAttribute('href')).toBe(
      'https://github.com/djazairdev/founders.coffee',
    );
    expect(link.getAttribute('dir')).toBe('ltr');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows each prize with its place, track, provider and value', () => {
    renderOffer(offer);

    const prizes = screen.getByRole('region', { name: 'Prizes' });
    const [overall, track] = within(prizes).getAllByRole('listitem');
    expect(overall?.textContent).toContain('Place 1');
    expect(overall?.textContent).toContain('Whole hackathon');
    expect(overall?.textContent).toContain('Provided by Algiers Builders');
    expect(overall?.textContent).toMatch(/Worth .*50,000/u);
    expect(track?.textContent).toContain('Open source');
    expect(track?.textContent).not.toContain('Worth');
  });

  it('leaves out a section with nothing in it', () => {
    renderOffer({ tracks: offer.tracks, prizes: [] });
    expect(screen.queryByRole('region', { name: 'Prizes' })).toBeNull();
    cleanup();

    const empty = renderOffer({ tracks: [], prizes: [] });
    expect(empty.container.innerHTML).toBe('');
  });

  it('reads in Arabic', () => {
    renderOffer(offer, 'ar');

    expect(screen.getByRole('region', { name: 'المسارات' })).toBeTruthy();
    expect(screen.getByText('الشريك: Djazair Dev')).toBeTruthy();
    expect(screen.getByText('الهاكاثون كله')).toBeTruthy();
  });
});
