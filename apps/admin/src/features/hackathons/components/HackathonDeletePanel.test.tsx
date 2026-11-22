import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HackathonDeletionCandidate } from '../api';
import { HackathonDeletePanel } from './HackathonDeletePanel';

const mocks = vi.hoisted(() => ({
  search: {
    data: [] as readonly HackathonDeletionCandidate[],
    isFetching: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
  },
  deletion: {
    mutate: vi.fn(),
    isPending: false,
  },
}));

vi.mock('../hooks', () => ({
  useHackathonsForDeletion: () => mocks.search,
  useDeleteAnyHackathon: () => mocks.deletion,
}));

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: () => document.querySelector('dialog')?.setAttribute('open', ''),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: () => document.querySelector('dialog')?.removeAttribute('open'),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(mocks.search, {
    data: [],
    isFetching: false,
    isError: false,
    isSuccess: true,
  });
  mocks.deletion.isPending = false;
});

describe('admin hackathon deletion (B-HKN-27)', () => {
  it('finds a hackathon and requires confirmation before deletion', () => {
    mocks.search.data = [
      {
        eventId: 'evt_published',
        title: 'University Innovation Weekend',
        slug: 'university-innovation-weekend',
        status: 'published',
        marketCode: 'DZ',
        startsAt: new Date('2026-12-05T08:00:00.000Z'),
        organisationName: 'University Makers Club',
      },
    ];
    render(<HackathonDeletePanel locale="en" />);

    fireEvent.change(
      screen.getByLabelText('Hackathon title, ID, or URL slug'),
      { target: { value: 'University Innovation Weekend' } },
    );

    expect(screen.getByText('University Innovation Weekend')).toBeTruthy();
    expect(
      screen.getByText(/University Makers Club · Market: DZ/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete hackathon' }));
    expect(
      screen.getByRole('heading', {
        name: 'Delete “University Innovation Weekend”?',
      }),
    ).toBeTruthy();
    expect(mocks.deletion.mutate).not.toHaveBeenCalled();
  });
});
