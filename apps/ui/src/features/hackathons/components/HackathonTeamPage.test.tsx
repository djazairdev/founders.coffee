import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { TeamPageView } from '../api';
import { EVENT_ID, markets, mutation, teamView } from '../team-page.fixtures';
import { HackathonTeamPage } from './HackathonTeamPage';

const mocks = vi.hoisted(() => ({
  page: {
    data: undefined as unknown,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  changes: {} as Record<
    string,
    ReturnType<typeof import('../team-page.fixtures').mutation>
  >,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <a href="/e" className={className}>
      {children}
    </a>
  ),
}));

const change = (name: string) => {
  mocks.changes[name] ??= mutation();
  return mocks.changes[name];
};

vi.mock('../team-hooks', () => ({
  useTeamPage: () => mocks.page,
  useCreateTeam: () => change('create'),
  useCreateTeamInvite: () => change('invite'),
  useRevokeTeamInvite: () => change('revoke'),
  useJoinTeam: () => change('join'),
  useAnswerTeamRequest: () => change('answer'),
  useCancelTeamRequest: () => change('cancel'),
  useLeaveTeam: () => change('leave'),
  usePassCaptaincy: () => change('pass'),
  useRemoveTeamMember: () => change('remove'),
}));

afterEach(() => {
  cleanup();
  mocks.page = {
    data: undefined,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.changes = {};
});

const renderPage = (
  view: TeamPageView | undefined,
  options: { locale?: Locale; joinToken?: string } = {},
) => {
  mocks.page.data = view;
  const onTokenUsed = vi.fn();
  const page = () => (
    <HackathonTeamPage
      eventId={EVENT_ID}
      locale={options.locale ?? 'en'}
      markets={markets}
      joinToken={options.joinToken}
      onTokenUsed={onTokenUsed}
    />
  );
  const { rerender } = render(page());
  return { onTokenUsed, rerender: () => rerender(page()) };
};

const TOKEN = 'a'.repeat(43);

describe('HackathonTeamPage (B-TEAM-07)', () => {
  it('says how long teams can change and how big they are', () => {
    renderPage(teamView());

    expect(
      screen.getByRole('heading', { name: 'Your team', level: 1 }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Teams can change until submissions close, Sat, Mar 14, 12:00. Teams have 2 to 4 people.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Algiers Builders Weekend/u }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'See who is looking for a team' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Your team’s project' }),
    ).toBeTruthy();
  });

  it('asks someone not registered, or waitlisted, to wait for a place', () => {
    renderPage(teamView({ registration: null }, null));
    expect(
      screen.getByText(/^Register for this hackathon first/u),
    ).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'Your team’s project' }),
    ).toBeNull();
    cleanup();

    renderPage(teamView({ registration: 'waitlisted' }, null));
    expect(screen.getByText(/^You are on the waitlist/u)).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'See who is looking for a team' }),
    ).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Start a team' })).toBeNull();
  });

  it('lets a member in no team start one, checking the name first', () => {
    renderPage(teamView({}, null));

    fireEvent.click(screen.getByRole('button', { name: 'Start the team' }));
    expect(
      screen.getByText('Give the team a name of up to 60 characters.'),
    ).toBeTruthy();
    expect(change('create').mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Team name'), {
      target: { value: '  Byte Club ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start the team' }));
    expect(change('create').mutate).toHaveBeenCalledWith({
      name: 'Byte Club',
      description: null,
      isLookingForMembers: true,
    });
  });

  it('joins the team whose link was opened, then confirms it', () => {
    const { onTokenUsed, rerender } = renderPage(teamView({}, null), {
      joinToken: TOKEN,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Join the team' }));
    const [token, options] = change('join').mutate.mock.calls[0] as [
      string,
      { onSuccess: (joined: { teamId: string }) => void },
    ];
    expect(token).toBe(TOKEN);
    act(() => options.onSuccess({ teamId: 'tea_byte' }));
    expect(onTokenUsed).toHaveBeenCalled();
    mocks.page.data = teamView({}, { isCaptain: false });
    rerender();
    expect(screen.getByText('You joined the team.')).toBeTruthy();
  });

  it('does not say a team was joined when it was started', () => {
    renderPage(teamView({}, { isCaptain: true }));

    expect(screen.queryByText('You joined the team.')).toBeNull();
  });

  it('says why a join was refused', () => {
    change('join').isError = true;
    change('join').error = Object.assign(new Error('full'), {
      code: 'team_full',
    });
    renderPage(teamView({}, null), { joinToken: TOKEN });

    expect(screen.getByText('This team is full.')).toBeTruthy();
  });

  it('lists the member’s own requests, which they can withdraw', () => {
    renderPage(
      teamView(
        {
          ownRequests: [
            {
              id: 'treq_9',
              teamId: 'tea_x',
              teamName: 'Byte Club',
              createdAt: 0,
            },
          ],
        },
        null,
      ),
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent === 'Waiting for Byte Club to answer.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(change('cancel').mutate).toHaveBeenCalledWith('treq_9');
  });

  it('shows the team read-only once submissions have closed', () => {
    renderPage(teamView({ canChangeTeams: false }));

    expect(
      screen.getByText(
        'Submissions have closed, so teams can no longer change. Teams have 2 to 4 people.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Karim')).toBeTruthy();
  });

  it('says it is loading, and offers to retry when the read fails', () => {
    renderPage(undefined);
    expect(screen.getByText('Loading your team…')).toBeTruthy();
    cleanup();

    mocks.page.isError = true;
    renderPage(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.page.refetch).toHaveBeenCalled();
  });

  it('reads in Arabic and in French', () => {
    renderPage(teamView(), { locale: 'ar' });
    expect(
      screen.getByRole('heading', { name: 'فريقك', level: 1 }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'الأعضاء' })).toBeTruthy();
    cleanup();

    renderPage(teamView(), { locale: 'fr' });
    expect(
      screen.getByRole('heading', { name: 'Votre équipe', level: 1 }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Membres' })).toBeTruthy();
  });
});
