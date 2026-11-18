import { cleanup, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ userId: 'user_1' as string | undefined }));

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
    params: { userId: string };
  }) =>
    createElement(
      'a',
      { href: to.replace('$userId', params.userId), className },
      children,
    ),
}));

vi.mock('../hooks', () => ({
  useMyProfile: () => ({
    data: undefined,
    userId: mocks.userId,
    isAuthLoading: false,
    isPending: true,
    refetch: vi.fn(),
  }),
}));

vi.mock('../useUnsavedGuard', () => ({
  useUnsavedGuard: () => ({ isBlocked: false, stay: vi.fn(), leave: vi.fn() }),
}));

vi.mock('../../account/components/ProfileSectionNav', () => ({
  ProfileSectionNav: () => null,
}));

vi.mock('./ProfileAccess', () => ({ ProfileAccess: () => null }));

const { ProfilePage } = await import('./ProfilePage');

afterEach(cleanup);

describe('ProfilePage', () => {
  it('lets a member see the profile others see', () => {
    mocks.userId = 'user_1';
    render(<ProfilePage locale="en" />);
    expect(
      screen
        .getByRole('link', { name: 'View your public profile' })
        .getAttribute('href'),
    ).toBe('/$locale/u/user_1');
  });

  it('offers no public profile before the member is known', () => {
    mocks.userId = undefined;
    render(<ProfilePage locale="en" />);
    expect(
      screen.queryByRole('link', { name: 'View your public profile' }),
    ).toBeNull();
  });
});
