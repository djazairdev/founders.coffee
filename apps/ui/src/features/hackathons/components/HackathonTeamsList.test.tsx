import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonTeamsView } from '../api';
import { HackathonTeamsList } from './HackathonTeamsList';

type Team = HackathonTeamsView['teams'][number];

const mocks = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock('../hooks', () => ({
  useHackathonTeams: () => mocks.query,
}));

afterEach(() => {
  cleanup();
  mocks.query = { data: undefined, isError: false, refetch: vi.fn() };
});

const team = (name: string, changes: Partial<Team> = {}): Team => ({
  teamId: `tem_${name}`,
  name,
  members: [
    { userId: 'usr_a', name: 'Amina', isCaptain: true },
    { userId: 'usr_b', name: 'Karim', isCaptain: false },
  ],
  trackTitle: null,
  submissionStatus: null,
  ...changes,
});

const show = (view: HackathonTeamsView | undefined, locale: Locale = 'en') => {
  mocks.query.data = view;
  return render(<HackathonTeamsList eventId="evt_1" locale={locale} />);
};

const cells = (rowIndex: number) =>
  Array.from(
    screen.getAllByRole('row')[rowIndex]?.querySelectorAll('td') ?? [],
    (cell) => cell.textContent,
  );

describe('HackathonTeamsList (B-OPS-02)', () => {
  it('shows each team with its members, track and where its entry stands', () => {
    show({
      teams: [
        team('Byte Club', {
          trackTitle: 'Payments',
          submissionStatus: 'submitted',
        }),
        team('Copper Crew'),
        team('Draft Crew', { submissionStatus: 'draft' }),
        team('Copy Cats', { submissionStatus: 'disqualified' }),
      ],
      isTruncated: false,
    });

    expect(
      screen.getAllByRole('columnheader').map((cell) => cell.textContent),
    ).toEqual(['Team', 'Members', 'Track', 'Submission']);
    expect(cells(1)[0]).toBe('Byte Club');
    expect(cells(1)[1]).toContain('Amina');
    expect(cells(1)[1]).toContain('(captain)');
    expect(cells(1)[1]).toContain('Karim');
    expect(cells(1).slice(2)).toEqual(['Payments', 'Submitted']);
    expect(cells(2).slice(2)).toEqual(['No track', 'Not started']);
    expect(cells(3)[3]).toBe('Draft');
    expect(cells(4)[3]).toBe('Disqualified');
  });

  it('pages a long list', () => {
    show({
      teams: Array.from({ length: 26 }, (_, index) => team(`Team ${index}`)),
      isTruncated: false,
    });

    expect(screen.getByText('Page 1 of 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Team 25')).toBeTruthy();
  });

  it('says when there are no teams, and when the list stops short', () => {
    show({ teams: [], isTruncated: false });
    expect(screen.getByText('No teams yet.')).toBeTruthy();
    cleanup();

    show({ teams: [team('Byte Club')], isTruncated: true });
    expect(screen.getByText('Only the first 1 are shown.')).toBeTruthy();
  });

  it('offers a retry when the list cannot load, and shows it is loading', () => {
    show(undefined);
    expect(screen.getByText('Loading the teams…')).toBeTruthy();
    cleanup();

    mocks.query.isError = true;
    show(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.query.refetch).toHaveBeenCalled();
  });

  it('reads in Arabic and French', () => {
    show({ teams: [team('Byte Club')], isTruncated: false }, 'ar');
    expect(screen.getByRole('columnheader', { name: 'الأعضاء' })).toBeTruthy();
    cleanup();

    show({ teams: [team('Byte Club')], isTruncated: false }, 'fr');
    expect(screen.getByRole('columnheader', { name: 'Membres' })).toBeTruthy();
  });
});
