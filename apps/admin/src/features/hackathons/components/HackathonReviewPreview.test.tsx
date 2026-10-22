import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonReviewItem } from '../api';
import { HackathonReviewPreview } from './HackathonReviewPreview';

afterEach(() => cleanup());

const item: HackathonReviewItem = {
  eventId: 'evt_review',
  title: 'Algiers Builders Hackathon',
  description: 'Two days of building with founders across Algiers.',
  marketCode: 'DZ',
  cityCode: '1',
  startsAt: new Date('2026-12-05T08:00:00Z'),
  endsAt: new Date('2026-12-07T08:00:00Z'),
  timeZone: 'Africa/Algiers',
  organisation: { name: 'Algiers Builders', slug: 'algiers-builders' },
  submittedAt: new Date('2026-10-22T09:00:00Z'),
  registrationOpensAt: new Date('2026-11-01T08:00:00Z'),
  registrationClosesAt: new Date('2026-12-04T08:00:00Z'),
  submissionDeadlineAt: new Date('2026-12-07T07:00:00Z'),
  judgingEndsAt: new Date('2026-12-14T08:00:00Z'),
  capacity: null,
  minimumAge: null,
  teamMin: 2,
  teamMax: 4,
  rules: null,
  format: 'hybrid',
  venue: 'Café des Délices, Hydra',
  meetingUrl: 'https://meet.example.com/builders',
  languages: ['ar', 'fr'],
  attendanceModes: ['in_person', 'online'],
  aiPolicy: 'ai_native',
  aiPolicyNote: 'Any assistant, named in the submission.',
  licenceNote: null,
  tracks: [
    {
      id: 'trk_cafes',
      kind: 'partner_technology',
      title: 'Payments for cafés',
      brief: 'Take a payment at the counter without a card machine.',
      partnerName: 'Dahabia Labs',
      sourceUrls: ['https://docs.example.com/payments'],
    },
  ],
  prizes: [
    {
      id: 'prz_first',
      trackId: 'trk_cafes',
      place: 1,
      title: 'First prize',
      description: 'Mentoring and cloud credits for the winning team.',
      providerName: 'Algiers Builders',
      value: { amount_minor: 5_000_000, currency: 'DZD' },
      isConfirmed: false,
    },
  ],
  criteria: [
    { name: 'Impact', description: 'Who it helps.', weight: 40, scale: 5 },
    { name: 'Craft', description: 'How well it works.', weight: 30, scale: 5 },
    {
      name: 'Demo',
      description: 'How clearly it shows.',
      weight: 30,
      scale: 5,
    },
  ],
};

const renderPreview = (
  overrides: Partial<HackathonReviewItem> = {},
  locale: Locale = 'en',
) =>
  render(
    <HackathonReviewPreview item={{ ...item, ...overrides }} locale={locale} />,
  );

describe('a hackathon’s full preview in the review queue (B-HKN-09)', () => {
  it('starts folded, under a summary the reviewer opens', () => {
    const { container } = renderPreview();

    const details = container.querySelector('details');
    expect(details?.open).toBe(false);
    expect(
      within(details as HTMLElement).getByText('Full preview'),
    ).toBeTruthy();
  });

  it('shows how and where it is held, in which languages, under which policies', () => {
    renderPreview();

    expect(screen.getByText('Hybrid')).toBeTruthy();
    expect(screen.getByText('Café des Délices, Hydra')).toBeTruthy();
    expect(screen.getByText('https://meet.example.com/builders')).toBeTruthy();
    expect(screen.getByText('Arabic · French')).toBeTruthy();
    expect(screen.getByText('In person · Online')).toBeTruthy();
    expect(
      screen.getByText('Any assistant, named in the submission.'),
    ).toBeTruthy();
    expect(screen.getByText('Not given')).toBeTruthy();
  });

  it('shows each track with its brief, partner and sources', () => {
    renderPreview();

    expect(screen.getByText('Payments for cafés')).toBeTruthy();
    expect(
      screen.getByText('Take a payment at the counter without a card machine.'),
    ).toBeTruthy();
    expect(screen.getByText('Partner: Dahabia Labs')).toBeTruthy();
    const source = screen.getByRole('link', {
      name: 'https://docs.example.com/payments',
    });
    expect(source.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows each prize with its value and track, and says when it is not confirmed', () => {
    renderPreview();

    expect(screen.getByText('First prize')).toBeTruthy();
    expect(screen.getByText('Provided by Algiers Builders')).toBeTruthy();
    expect(screen.getByText(/^Worth .*50,000/u)).toBeTruthy();
    expect(screen.getByText('Track: Payments for cafés')).toBeTruthy();
    expect(screen.getByText('Not confirmed yet')).toBeTruthy();
  });

  it('says when there are no prizes, and hides the badge once confirmed', () => {
    renderPreview({ prizes: [] });
    expect(screen.getByText('No prizes')).toBeTruthy();
    cleanup();

    renderPreview({ prizes: [{ ...item.prizes[0]!, isConfirmed: true }] });
    expect(screen.queryByText('Not confirmed yet')).toBeNull();
  });

  it('shows the rubric with its scale and weights', () => {
    renderPreview();

    expect(
      screen.getByText('Each criterion is scored from 1 to 5'),
    ).toBeTruthy();
    expect(screen.getByText('Weight: 40%')).toBeTruthy();
    expect(screen.getAllByText('Weight: 30%')).toHaveLength(2);
  });

  it('reads in Arabic, with Latin digits', () => {
    renderPreview({}, 'ar');

    expect(screen.getByText('المعاينة الكاملة')).toBeTruthy();
    expect(screen.getByText('الوزن: 40%')).toBeTruthy();
    expect(screen.getByText('الشريك: Dahabia Labs')).toBeTruthy();
  });
});
