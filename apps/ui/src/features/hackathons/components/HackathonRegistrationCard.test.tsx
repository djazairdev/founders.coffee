import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError, type EventFormat } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import type { HackathonRegistrationView, HackathonSchedule } from '../api';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  withdraw: vi.fn(),
  invalidate: vi.fn(),
  isAuthenticated: true,
}));

vi.mock('../api', () => ({
  registrationApi: { register: mocks.register, withdraw: mocks.withdraw },
}));

vi.mock('../../../lib/app-providers', () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    to,
    search,
  }: {
    children: ReactNode;
    className?: string;
    to: string;
    search?: { redirect?: string };
  }) =>
    createElement(
      'a',
      {
        href: search?.redirect ? `${to}?redirect=${search.redirect}` : to,
        className,
      },
      children,
    ),
  useRouter: () => ({ invalidate: mocks.invalidate }),
  useLocation: () => '/en/algeria/e/builders',
}));

const { HackathonRegistrationCard } =
  await import('./HackathonRegistrationCard');

const KICKOFF = Date.UTC(2099, 0, 22, 9);
const DAY = 86_400_000;

const schedule = (phase: HackathonSchedule['phase']): HackathonSchedule => ({
  registrationOpensAt: KICKOFF - 18 * DAY,
  registrationClosesAt: KICKOFF - DAY,
  kickoffAt: KICKOFF,
  submissionDeadlineAt: KICKOFF + 7 * DAY,
  endsAt: KICKOFF + 8 * DAY,
  judgingEndsAt: KICKOFF + 15 * DAY,
  phase,
});

const renderCard = ({
  phase = 'registration_open',
  registration = { isFull: false, viewer: null },
  format = 'hybrid',
  minimumAge = 18,
  locale = 'en',
}: {
  phase?: HackathonSchedule['phase'];
  registration?: HackathonRegistrationView;
  format?: EventFormat;
  minimumAge?: number | null;
  locale?: Locale;
} = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HackathonRegistrationCard
        eventId="evt_builders"
        format={format}
        minimumAge={minimumAge}
        schedule={schedule(phase)}
        registration={registration}
        timeZone="Africa/Algiers"
        locale={locale}
      />
    </QueryClientProvider>,
  );

const viewer = (
  status: 'registered' | 'waitlisted' | 'withdrawn' | 'disqualified',
) => ({
  isFull: false,
  viewer: { status, attendanceMode: 'online' as const },
});

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.isAuthenticated = true;
});

describe('HackathonRegistrationCard (B-REG-06)', () => {
  it('says when registration opens, before it does', () => {
    renderCard({ phase: 'upcoming' });

    expect(screen.getByText(/^Registration opens /u)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says registration has closed once it has', () => {
    renderCard({ phase: 'registration_closed' });

    expect(screen.getByText(/^Registration has closed\./u)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sends a signed-out reader to sign in and back', () => {
    mocks.isAuthenticated = false;
    renderCard();

    expect(
      screen
        .getByRole('link', { name: 'Sign in to register' })
        .getAttribute('href'),
    ).toBe('/$locale/login?redirect=/en/algeria/e/builders');
  });

  it('takes the member to each missing answer in turn, then registers', async () => {
    mocks.register.mockResolvedValue({
      registrationId: 'reg_1',
      status: 'registered',
    });
    renderCard();

    submit();
    expect(screen.getByText('Choose how you’ll take part.')).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: 'In person' }),
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Online' }));
    submit();
    expect(screen.getByText('Confirm your age to register.')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'I am at least 18 years old.' }),
    );
    submit();
    expect(
      screen.getByText('Accept the code of conduct to register.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: /code of conduct/u }));
    submit();

    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
    expect(mocks.register.mock.calls[0]?.[0]).toEqual({
      eventId: 'evt_builders',
      attendanceMode: 'online',
      acceptsCodeOfConduct: true,
      isAgeAttested: true,
    });
  });

  it('asks nothing a single-format hackathon without an age already answers', async () => {
    mocks.register.mockResolvedValue({
      registrationId: 'reg_1',
      status: 'registered',
    });
    renderCard({ format: 'online', minimumAge: null });

    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /years old/u })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /code of conduct/u }));
    submit();

    await waitFor(() =>
      expect(mocks.register.mock.calls[0]?.[0]).toEqual({
        eventId: 'evt_builders',
        attendanceMode: 'online',
        acceptsCodeOfConduct: true,
        isAgeAttested: false,
      }),
    );
  });

  it('offers the waitlist once every place is taken', () => {
    renderCard({ registration: { isFull: true, viewer: null } });

    expect(screen.getByText(/^Every place is taken\./u)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Join the waitlist' }),
    ).toBeTruthy();
  });

  it('says why a registration was refused', async () => {
    mocks.register.mockRejectedValue(
      new AppError('registration_closed', 'closed'),
    );
    renderCard({ format: 'online', minimumAge: null });

    fireEvent.click(screen.getByRole('checkbox', { name: /code of conduct/u }));
    submit();

    expect(await screen.findByText('Registration has closed.')).toBeTruthy();
  });

  it('shows a registered member their place, and withdraws only once confirmed', async () => {
    mocks.withdraw.mockResolvedValue({ eventId: 'evt_builders' });
    renderCard({ registration: viewer('registered') });

    expect(screen.getByText('You’re registered.')).toBeTruthy();
    expect(screen.getByText('Online')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(mocks.withdraw).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'If you withdraw, you can’t register for this hackathon again.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
    expect(mocks.withdraw.mock.calls[0]?.[0]).toBe('evt_builders');
  });

  it('lets a waitlisted member leave the list, until submissions close', () => {
    renderCard({ registration: viewer('waitlisted') });
    expect(screen.getByText(/^You’re on the waitlist\./u)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Leave the waitlist' }),
    ).toBeTruthy();
    cleanup();

    renderCard({ phase: 'judging', registration: viewer('waitlisted') });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('tells a member who left or was removed where they stand', () => {
    renderCard({ registration: viewer('withdrawn') });
    expect(screen.getByText('You left this hackathon.')).toBeTruthy();
    cleanup();

    renderCard({ registration: viewer('disqualified') });
    expect(
      screen.getByText('You can no longer take part in this hackathon.'),
    ).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderCard({ locale: 'ar', registration: { isFull: true, viewer: null } });

    expect(screen.getByRole('heading', { name: 'المشاركة' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'انضمّ إلى قائمة الانتظار' }),
    ).toBeTruthy();
  });
});
