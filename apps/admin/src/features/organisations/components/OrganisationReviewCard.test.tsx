import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OrganisationReviewItem } from '../api';
import { OrganisationReviewCard } from './OrganisationReviewCard';

afterEach(() => cleanup());

const item: OrganisationReviewItem = {
  id: 'org_1',
  name: 'Oran Makers',
  slug: 'oran-makers',
  kind: 'club',
  status: 'pending',
  marketCode: 'DZ',
  cityCode: null,
  description: 'Builders meeting every month in Oran.',
  websiteUrl: 'https://oran-makers.example',
  createdAt: new Date('2026-10-20T23:30:00Z'),
  reviewNote: null,
  reviewedAt: null,
  ownerLeftAt: null,
  ownerName: 'Samira',
  timeZone: 'Africa/Algiers',
};

const renderCard = (overrides: Partial<OrganisationReviewItem> = {}) =>
  render(
    <OrganisationReviewCard
      isDeciding={false}
      item={{ ...item, ...overrides }}
      locale="en"
      onDecide={vi.fn()}
    />,
  );

describe('an organisation in the review queue (B-ORG-06)', () => {
  it('shows the application’s details and its owner', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Oran Makers' })).toBeTruthy();
    expect(screen.getByText('Club')).toBeTruthy();
    expect(
      screen.getByText('Builders meeting every month in Oran.'),
    ).toBeTruthy();
    expect(screen.getByText('Samira')).toBeTruthy();
    expect(screen.getByText('DZ')).toBeTruthy();
  });

  it('dates the application in its market’s time zone', () => {
    renderCard();

    expect(screen.getByText(/Applied on Oct 21, 2026/)).toBeTruthy();
  });

  it('opens the website away from the admin app, without a referrer', () => {
    renderCard();

    const link = screen.getByRole('link', {
      name: 'https://oran-makers.example',
    });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('says when there is no owner left', () => {
    renderCard({ ownerName: null, websiteUrl: null });

    expect(screen.getByText('No owner')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the last note and when it was written', () => {
    renderCard({
      status: 'suspended',
      reviewNote: 'Reported for spam, under review.',
      reviewedAt: new Date('2026-10-21T10:00:00Z'),
    });

    expect(screen.getByText('Reported for spam, under review.')).toBeTruthy();
    expect(screen.getByText(/Last reviewed on Oct 21, 2026/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reinstate' })).toBeTruthy();
  });
});
