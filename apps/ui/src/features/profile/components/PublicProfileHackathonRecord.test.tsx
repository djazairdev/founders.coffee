import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublicProfile } from '../api';
import { PublicProfileHackathonRecord } from './PublicProfileHackathonRecord';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params: Record<string, string>;
    children: ReactNode;
  }) => (
    <a
      href={Object.entries(params).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
    >
      {children}
    </a>
  ),
}));

const WON = {
  title: 'Algiers Builders',
  slug: 'algiers-builders',
  marketSlug: 'algeria',
  kind: 'winner' as const,
  placements: ['First prize'],
  certificateCode: 'code-won',
  projectSlug: 'ledger-ab12',
};

const profileWith = (hackathonRecord: PublicProfile['hackathonRecord']) =>
  ({ hackathonRecord }) as PublicProfile;

afterEach(cleanup);

describe('PublicProfileHackathonRecord', () => {
  it('links each hackathon to its results, project and certificate, and says what happened', () => {
    render(
      <PublicProfileHackathonRecord
        locale="en"
        profile={profileWith([
          WON,
          {
            ...WON,
            kind: 'judge',
            placements: [],
            certificateCode: 'code-judged',
            projectSlug: null,
          },
        ])}
      />,
    );

    const [first] = screen.getAllByRole('link', { name: 'Algiers Builders' });
    expect(first?.getAttribute('href')).toBe('/en/algeria/e/algiers-builders');
    expect(screen.getByText('First prize')).toBeTruthy();
    expect(screen.getByText(/Won a prize/u)).toBeTruthy();
    expect(screen.getByText('Judged')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Project' }).getAttribute('href'),
    ).toBe('/en/p/ledger-ab12');
    expect(
      screen
        .getAllByRole('link', { name: 'Certificate' })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/en/c/code-won', '/en/c/code-judged']);
  });

  it('shows nothing for a member with no record to show', () => {
    const { container } = render(
      <PublicProfileHackathonRecord locale="ar" profile={profileWith([])} />,
    );

    expect(container.innerHTML).toBe('');
  });
});
