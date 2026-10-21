import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Market } from '@founders-coffee/db';

import { HackathonAnnouncement } from './HackathonAnnouncement';
import { market } from './city-landing.fixtures';

const egypt: Market = {
  ...market,
  code: 'EG',
  slug: 'egypt',
  timezone: 'Africa/Cairo',
};

const renderAt = (iso: string, locale: 'ar' | 'fr' | 'en', at = market) => {
  vi.useFakeTimers({ now: new Date(iso), toFake: ['Date'] });
  return render(<HackathonAnnouncement locale={locale} market={at} />);
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the first hackathon announcement', () => {
  it('announces the week, what participants leave with and the dates, in English', () => {
    renderAt('2026-10-21T10:00:00Z', 'en');

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'The first founders.coffee hackathon',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Online, 22–30 January 2027')).toBeTruthy();
    expect(screen.getByText('Kickoff Friday 22 January')).toBeTruthy();
    expect(
      screen.getByText('Submissions close Friday 29 January'),
    ).toBeTruthy();
    expect(screen.getByText('Demo day Saturday 30 January')).toBeTruthy();
    expect(screen.getByText('Registration opens on 4 January.')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });

  it('writes the dates the way Algeria names them, in Arabic', () => {
    renderAt('2026-10-21T10:00:00Z', 'ar');

    expect(screen.getByText('عن بُعد، من 22 إلى 30 جانفي 2027')).toBeTruthy();
    expect(screen.getByText('الانطلاق الجمعة 22 جانفي')).toBeTruthy();
    expect(
      screen.getByText('آخر أجل لتسليم المشاريع الجمعة 29 جانفي'),
    ).toBeTruthy();
    expect(screen.getByText('يوم العرض السبت 30 جانفي')).toBeTruthy();
    expect(screen.getByText('يُفتح التسجيل يوم 4 جانفي.')).toBeTruthy();
  });

  it('writes the dates in French', () => {
    renderAt('2026-10-21T10:00:00Z', 'fr');

    expect(screen.getByText('En ligne, du 22 au 30 janvier 2027')).toBeTruthy();
    expect(screen.getByText('Lancement vendredi 22 janvier')).toBeTruthy();
    expect(
      screen.getByText('Les inscriptions ouvrent le 4 janvier.'),
    ).toBeTruthy();
  });

  it('names no prize', () => {
    const { container } = renderAt('2026-10-21T10:00:00Z', 'en');

    expect(container.textContent).not.toMatch(/prize|DZD|€|\$/iu);
  });

  it('hides itself once registration opens in Algiers', () => {
    const { container } = renderAt('2027-01-03T23:00:00Z', 'en');

    expect(container.innerHTML).toBe('');
  });

  it('stays off the pages of a market the hackathon does not run in', () => {
    const { container } = renderAt('2026-10-21T10:00:00Z', 'en', egypt);

    expect(container.innerHTML).toBe('');
  });
});
