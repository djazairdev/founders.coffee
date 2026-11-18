import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonParticipantsView } from '../api';
import { HackathonParticipantsList } from './HackathonParticipantsList';

type Participant = HackathonParticipantsView['participants'][number];

const mocks = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock('../hooks', () => ({
  useHackathonParticipants: () => mocks.query,
}));

afterEach(() => {
  cleanup();
  mocks.query = { data: undefined, isError: false, refetch: vi.fn() };
});

const person = (
  index: number,
  changes: Partial<Participant> = {},
): Participant => ({
  userId: `usr_${index}`,
  name: `Person ${index}`,
  attendanceMode: 'in_person',
  status: 'registered',
  teamName: null,
  ...changes,
});

const show = (
  view: HackathonParticipantsView | undefined,
  locale: Locale = 'en',
) => {
  mocks.query.data = view;
  return render(<HackathonParticipantsList eventId="evt_1" locale={locale} />);
};

const cells = (rowIndex: number) =>
  Array.from(
    screen.getAllByRole('row')[rowIndex]?.querySelectorAll('td') ?? [],
    (cell) => cell.textContent,
  );

describe('HackathonParticipantsList (B-REG-08)', () => {
  it('shows name, attendance, status and team, with no address or export', () => {
    show({
      participants: [
        person(1, { teamName: 'Byte Club' }),
        person(2, { attendanceMode: 'online', status: 'waitlisted' }),
        person(3, { status: 'withdrawn' }),
        person(4, { status: 'disqualified', name: '' }),
      ],
      isTruncated: false,
    });

    expect(
      screen.getAllByRole('columnheader').map((cell) => cell.textContent),
    ).toEqual(['Name', 'Taking part', 'Status', 'Team']);
    expect(cells(1)).toEqual([
      'Person 1',
      'In person',
      'Registered',
      'Byte Club',
    ]);
    expect(cells(2)).toEqual(['Person 2', 'Online', 'Waitlisted', 'No team']);
    expect(cells(3)?.[2]).toBe('Withdrawn');
    expect(cells(4)?.slice(0, 3)).toEqual([
      'A member',
      'In person',
      'Disqualified',
    ]);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('pages a long list and keeps focus on the button at the end', () => {
    show({
      participants: Array.from({ length: 30 }, (_, index) => person(index)),
      isTruncated: false,
    });

    expect(screen.getAllByRole('row')).toHaveLength(26);
    expect(screen.getByText('Page 1 of 2')).toBeTruthy();
    const previous = screen.getByRole('button', { name: 'Previous' });
    const next = screen.getByRole('button', { name: 'Next' });
    expect(previous.getAttribute('aria-disabled')).toBe('true');

    next.focus();
    fireEvent.click(next);

    expect(screen.getByText('Page 2 of 2')).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(next);
  });

  it('offers no paging for a short list', () => {
    show({ participants: [person(1)], isTruncated: false });

    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('says when the list stops short', () => {
    show({ participants: [person(1)], isTruncated: true });

    expect(screen.getByText('Only the first 1 are shown.')).toBeTruthy();
  });

  it('says when nobody has registered', () => {
    show({ participants: [], isTruncated: false });

    expect(screen.getByText('Nobody has registered yet.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('offers a retry when the list cannot load', () => {
    mocks.query.isError = true;
    show(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(mocks.query.refetch).toHaveBeenCalled();
  });

  it('shows that it is loading', () => {
    show(undefined);

    expect(screen.getByText('Loading the participants…')).toBeTruthy();
  });

  it('reads in Arabic and French', () => {
    show({ participants: [person(1)], isTruncated: false }, 'ar');
    expect(screen.getByRole('heading', { name: 'المشاركون' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'الفريق' })).toBeTruthy();
    cleanup();

    show({ participants: [person(1)], isTruncated: false }, 'fr');
    expect(screen.getByRole('columnheader', { name: 'Statut' })).toBeTruthy();
  });
});
