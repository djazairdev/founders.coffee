import { act } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HackathonRegistrationView, HackathonSchedule } from '../api';

const mocks = vi.hoisted(() => ({ isAuthenticated: false }));

vi.mock('../../../lib/app-providers', () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: string }) => (
    <a href="/ar/login">{children}</a>
  ),
  useLocation: () => '/ar/algeria/e/builders',
}));

vi.mock('./HackathonRegistrationForm', () => ({
  HackathonRegistrationForm: () => <form aria-label="Registration form" />,
}));

vi.mock('./HackathonParticipantLinks', () => ({
  HackathonParticipantLinks: () => null,
}));

vi.mock('./HackathonRegistrationStanding', () => ({
  HackathonRegistrationStanding: () => null,
}));

const { HackathonRegistrationAction } =
  await import('./HackathonRegistrationAction');

const schedule: HackathonSchedule = {
  registrationOpensAt: 1,
  registrationClosesAt: 3,
  kickoffAt: 4,
  submissionDeadlineAt: 5,
  endsAt: 6,
  judgingEndsAt: 7,
  phase: 'registration_open',
};

const registration: HackathonRegistrationView = {
  isFull: false,
  viewer: null,
  isJudge: false,
  isOrganiser: false,
};

const page = (
  <HackathonRegistrationAction
    eventId="evt_builders"
    format="online"
    minimumAge={null}
    schedule={schedule}
    registration={registration}
    timeZone="Africa/Algiers"
    locale="ar"
    applicationQuestions={[]}
  />
);

describe('HackathonRegistrationAction hydration', () => {
  let root: Root | undefined;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = undefined;
    document.body.replaceChildren();
    mocks.isAuthenticated = false;
  });

  it('keeps the signed-out registration link through hydration when the session arrives early', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(page);
    document.body.appendChild(container);
    const recoverableErrors: string[] = [];
    mocks.isAuthenticated = true;

    await act(async () => {
      root = hydrateRoot(container, page, {
        onRecoverableError: (error) =>
          recoverableErrors.push(
            error instanceof Error ? error.message : String(error),
          ),
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(
      container.querySelector('form[aria-label="Registration form"]'),
    ).not.toBeNull();
  });
});
