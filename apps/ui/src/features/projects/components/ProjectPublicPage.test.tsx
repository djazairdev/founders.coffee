import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProjectPage } from '../api';
import { ProjectPublicPage } from './ProjectPublicPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: ComponentProps<'a'> & {
    to: string;
    params: Record<string, string>;
    children: ReactNode;
  }) => (
    <a
      {...rest}
      href={Object.entries(params).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
    >
      {children}
    </a>
  ),
}));

const PROJECT: ProjectPage = {
  slug: 'ledger-ab12',
  title: 'Ledger',
  problem: 'A corner shop cannot see who owes it money.',
  description: 'A ledger kept on the phone.',
  stage: 'prototype',
  repositoryUrl: 'https://github.com/byte-club/ledger',
  demoUrl: null,
  websiteUrl: 'https://ledger.example',
  marketCode: 'DZ',
  marketSlug: 'algeria',
  timeZone: 'Africa/Algiers',
  isSearchIndexable: false,
  updatedAt: Date.parse('2099-01-02T12:00:00Z'),
  hackathon: { title: 'Algiers Builders', slug: 'algiers-builders' },
  trackTitle: 'Payments',
  aiStatement: 'We wrote every line ourselves.',
  rank: 2,
  trackRank: 1,
  members: [{ userId: 'usr_1', name: 'Rania' }],
};

afterEach(cleanup);

describe('ProjectPublicPage', () => {
  it('shows the problem, stage, links, members, hackathon, result, AI statement and date', () => {
    render(<ProjectPublicPage project={PROJECT} locale="en" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ledger' }),
    ).toBeTruthy();
    expect(screen.getByText('Prototype')).toBeTruthy();
    expect(screen.getByText(PROJECT.problem)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Source code' }).getAttribute('rel'),
    ).toContain('ugc');
    expect(screen.queryByRole('link', { name: 'Demo' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Rania' }).getAttribute('href'),
    ).toBe('/en/u/usr_1');
    expect(
      screen
        .getByRole('link', { name: 'Algiers Builders' })
        .getAttribute('href'),
    ).toBe('/en/algeria/e/algiers-builders');
    expect(screen.getByText('Payments')).toBeTruthy();
    expect(screen.getByText('Rank 2')).toBeTruthy();
    expect(screen.getByText('Track rank 1')).toBeTruthy();
    expect(screen.getByText(PROJECT.aiStatement ?? '')).toBeTruthy();
    expect(screen.getByText(/Updated .*2099/u)).toBeTruthy();
  });

  it('leaves out what a project without a hackathon or result does not have', () => {
    render(
      <ProjectPublicPage
        project={{
          ...PROJECT,
          description: '',
          hackathon: null,
          trackTitle: null,
          aiStatement: null,
          rank: null,
          trackRank: null,
          members: [],
        }}
        locale="ar"
      />,
    );

    expect(screen.queryByRole('heading', { name: 'الفريق' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'عن المشروع' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'المشكلة' })).toBeTruthy();
  });
});
