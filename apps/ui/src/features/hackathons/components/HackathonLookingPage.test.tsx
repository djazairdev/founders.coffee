import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type { LookingForTeamView } from '../api';
import {
  EVENT_ID,
  lookingView,
  markets,
  mutation,
} from '../team-page.fixtures';
import { HackathonLookingPage } from './HackathonLookingPage';

const mocks = vi.hoisted(() => ({
  looking: {
    data: undefined as unknown,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  ask: undefined as
    | (ReturnType<typeof import('../team-page.fixtures').mutation> & {
        variables?: string;
      })
    | undefined,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    to,
    params,
  }: {
    children: ReactNode;
    className?: string;
    to: string;
    params: Record<string, string>;
  }) => (
    <a
      href={Object.entries(params).reduce(
        (href, [key, value]) => href.replace(`$${key}`, value),
        to,
      )}
      className={className}
    >
      {children}
    </a>
  ),
}));

vi.mock('../team-hooks', () => ({
  useLookingForTeam: () => mocks.looking,
  useRequestToJoinTeam: () => {
    mocks.ask ??= mutation();
    return mocks.ask;
  },
}));

afterEach(() => {
  cleanup();
  mocks.looking = {
    data: undefined,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.ask = undefined;
});

const renderPage = (
  view: LookingForTeamView | undefined,
  locale: Locale = 'en',
) => {
  mocks.looking.data = view;
  return render(
    <HackathonLookingPage
      eventId={EVENT_ID}
      locale={locale}
      markets={markets}
    />,
  );
};

describe('HackathonLookingPage (B-TEAM-08)', () => {
  it('lists the teams looking for members and the participants looking for a team', () => {
    renderPage(lookingView());

    expect(
      screen.getByRole('heading', { name: 'Teams looking for members' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Byte Club' })).toBeTruthy();
    expect(screen.getByText('Payments for corner shops.')).toBeTruthy();
    expect(screen.getByText('Members: 2 of 4')).toBeTruthy();
    expect(screen.getByText('Request sent')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Ask to join' })).toHaveLength(
      1,
    );
    expect(
      screen.getByRole('link', { name: 'Lina' }).getAttribute('href'),
    ).toBe('/en/u/usr_lina');
    expect(screen.getByText('Design, React')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Your team' }).getAttribute('href'),
    ).toBe(`/en/hackathon/${EVENT_ID}/team`);
  });

  it('asks to join the team whose button is pressed', () => {
    renderPage(lookingView());

    const ask = screen.getByRole('button', { name: 'Ask to join' });
    expect(ask.getAttribute('aria-describedby')).toBe(
      'hackathon-looking-team-tea_byte',
    );
    fireEvent.click(ask);

    expect(mocks.ask?.mutate).toHaveBeenCalledWith('tea_byte');
  });

  it('says why a refused request did not go through', () => {
    mocks.ask = {
      ...mutation(),
      isError: true,
      error: new AppError('team_full', 'Full'),
    };
    renderPage(lookingView());

    expect(screen.getByText('This team is full.')).toBeTruthy();
  });

  it('hides asking to join from a member already in a team, and once teams are locked', () => {
    renderPage(lookingView({ isInTeam: true }));
    expect(
      screen.getByText(
        'You are already in a team. Leave it first to join another.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ask to join' })).toBeNull();
    cleanup();

    renderPage(lookingView({ canChangeTeams: false }));
    expect(
      screen.getByText(
        'Submissions have closed, so teams can no longer change.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ask to join' })).toBeNull();
  });

  it('lists nobody to someone not registered or waitlisted', () => {
    renderPage(
      lookingView({ registration: null, teams: [], participants: [] }),
    );
    expect(
      screen.getByText(
        'Register for this hackathon to see who is looking for a team.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    cleanup();

    renderPage(
      lookingView({ registration: 'waitlisted', teams: [], participants: [] }),
    );
    expect(screen.getByText(/You are on the waitlist/)).toBeTruthy();
  });

  it('says when nobody is looking, and when only the newest are shown', () => {
    renderPage(lookingView({ teams: [], participants: [] }));
    expect(
      screen.getByText('No team is looking for members right now.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Nobody is looking for a team right now.'),
    ).toBeTruthy();
    cleanup();

    renderPage(lookingView({ hasMoreTeams: true, hasMoreParticipants: true }));
    expect(
      screen.getByText('Only the 100 newest teams are shown.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Only the 100 newest participants are shown.'),
    ).toBeTruthy();
  });

  it('shows loading, then an error with a retry', () => {
    renderPage(undefined);
    expect(screen.getByText('Loading who is looking…')).toBeTruthy();
    cleanup();

    mocks.looking.isError = true;
    mocks.looking.error = new Error('down');
    renderPage(undefined);
    expect(screen.getByText('This list could not be loaded.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.looking.refetch).toHaveBeenCalled();
  });

  it('reads right to left in Arabic', () => {
    renderPage(lookingView(), 'ar');

    expect(
      screen.getByRole('heading', { name: 'فرق تبحث عن أعضاء' }),
    ).toBeTruthy();
    expect(screen.getByText('الأعضاء: 2 من 4')).toBeTruthy();
  });
});
