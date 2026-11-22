import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HackathonReviewIncompleteItem } from '../api';
import { HackathonIncompleteReviewCard } from './HackathonIncompleteReviewCard';

const mocks = vi.hoisted(() => ({
  email: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  },
}));

vi.mock('../hooks', () => ({
  useSendHackathonDraftEmail: () => mocks.email,
}));

afterEach(() => cleanup());

const item: HackathonReviewIncompleteItem = {
  isComplete: false,
  eventId: 'evt_incomplete',
  creatorEmail: 'organiser@example.test',
  version: 1,
  title: 'Campus innovation weekend',
  description: 'A weekend for student teams to build useful tools.',
  marketCode: 'DZ',
  cityCode: null,
  startsAt: new Date('2026-12-05T08:00:00Z'),
  endsAt: new Date('2026-12-07T08:00:00Z'),
  timeZone: 'Africa/Algiers',
  organisation: { name: 'Campus Builders', slug: 'campus-builders' },
  updatedAt: new Date('2026-11-20T09:00:00Z'),
  format: 'online',
  venue: null,
  meetingUrl: null,
  languages: ['ar'],
  tracks: [],
  prizes: [],
  criteria: [],
  missingSections: ['settings'],
  savedDeadlines: {
    registrationOpensAt: Date.parse('2026-11-01T08:00:00Z'),
    registrationClosesAt: Date.parse('2026-12-04T08:00:00Z'),
    submissionDeadlineAt: Date.parse('2026-12-07T07:00:00Z'),
    judgingEndsAt: Date.parse('2026-12-14T08:00:00Z'),
  },
  savedSettings: null,
};

describe('an incomplete hackathon in the admin queue (B-HKN-09, #551)', () => {
  it('shows missing sections and only the values already saved', () => {
    render(<HackathonIncompleteReviewCard item={item} locale="en" />);

    expect(screen.getByText('Incomplete draft')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'organiser@example.test' })
        .getAttribute('href'),
    ).toBe('mailto:organiser@example.test');
    expect(screen.getByText('Participation rules and settings')).toBeTruthy();
    expect(screen.getByText('Campus Builders')).toBeTruthy();
    expect(screen.queryByText('Team size')).toBeNull();
    expect(screen.queryByText('Approve and publish')).toBeNull();
    expect(
      screen.getByText(
        'Review actions become available once the required information is complete.',
      ),
    ).toBeTruthy();
  });
});
