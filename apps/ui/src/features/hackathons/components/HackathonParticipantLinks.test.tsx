import { cleanup, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    to,
  }: {
    children: ReactNode;
    className?: string;
    to: string;
  }) => createElement('a', { href: to, className }, children),
}));

const { HackathonParticipantLinks } =
  await import('./HackathonParticipantLinks');

const renderLinks = (roles: {
  isRegistered?: boolean;
  isJudge?: boolean;
  isOrganiser?: boolean;
}) =>
  render(
    <HackathonParticipantLinks
      eventId="evt_1"
      isRegistered={roles.isRegistered ?? false}
      isJudge={roles.isJudge ?? false}
      isOrganiser={roles.isOrganiser ?? false}
      locale="en"
    />,
  );

const hrefOf = (name: string) =>
  screen.getByRole('link', { name }).getAttribute('href');

describe('HackathonParticipantLinks', () => {
  afterEach(cleanup);

  it('leads each role to its own page', () => {
    renderLinks({ isRegistered: true, isJudge: true, isOrganiser: true });
    expect(hrefOf('Go to your team')).toBe('/$locale/hackathon/$eventId/team');
    expect(hrefOf('Go to judging')).toBe('/$locale/hackathon/$eventId/judge');
    expect(hrefOf('Manage this hackathon')).toBe(
      '/$locale/hackathon/$eventId/manage',
    );
  });

  it('shows only the links the viewer has a role for', () => {
    renderLinks({ isJudge: true });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Go to your team' })).toBeNull();
  });

  it('renders nothing for someone with no role', () => {
    const { container } = renderLinks({});
    expect(container.childElementCount).toBe(0);
  });
});
