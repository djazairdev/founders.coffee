import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import { markets, ownerView, viewWith } from '../my-organisation.fixtures';
import { MyOrganisationPage } from './MyOrganisationPage';

const mocks = vi.hoisted(() => ({ mine: vi.fn() }));

vi.mock('../api', () => ({ organisationsApi: { mine: mocks.mine } }));

afterEach(() => {
  cleanup();
  mocks.mine.mockReset();
});

const renderPage = (locale: Locale = 'en') =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MyOrganisationPage
        slug="oran-makers"
        locale={locale}
        markets={markets}
      />
    </QueryClientProvider>,
  );

describe('MyOrganisationPage (B-ORG-09)', () => {
  it('shows an owner the approval, the members and the invitations still waiting', async () => {
    mocks.mine.mockResolvedValue(ownerView);
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Oran Makers' }),
    ).toBeTruthy();
    expect(mocks.mine).toHaveBeenCalledWith('oran-makers');
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('Approved on October 1, 2026')).toBeTruthy();
    expect(screen.getByText('Amina Kaci')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Remove Amina Kaci' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Remove Yacine Bel' }),
    ).toBeTruthy();
    expect(screen.getByText('waiting@example.org')).toBeTruthy();
    expect(screen.getByText('Expires October 29, 2099')).toBeTruthy();
    expect(screen.getByText('Expired')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Cancel the invitation to lapsed@example.org',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Send invitation' }),
    ).toBeTruthy();
  });

  it('shows a pending organisation when it applied, and nothing to manage', async () => {
    mocks.mine.mockResolvedValue(
      viewWith({
        review: {
          status: 'pending',
          appliedAt: new Date('2026-10-20T09:00:00Z'),
        },
        canManage: false,
        members: [],
        invitations: [],
      }),
    );
    renderPage();

    expect(await screen.findByText('Waiting for review')).toBeTruthy();
    expect(screen.getByText('Applied on October 20, 2026')).toBeTruthy();
    expect(screen.getByText(/replies by email/)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Members' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Send invitation' }),
    ).toBeNull();
  });

  it('shows a rejected organisation the decision date and the team’s note', async () => {
    mocks.mine.mockResolvedValue(
      viewWith({
        review: {
          status: 'rejected',
          reviewedAt: new Date('2026-10-02T12:00:00Z'),
          note: 'Add a website we can check.',
        },
        canManage: false,
      }),
    );
    renderPage();

    expect(await screen.findByText('Not approved')).toBeTruthy();
    expect(screen.getByText('Decided on October 2, 2026')).toBeTruthy();
    expect(screen.getByText('The team’s note')).toBeTruthy();
    expect(screen.getByText('Add a website we can check.')).toBeTruthy();
  });

  it('shows a suspended organisation what it can no longer do', async () => {
    mocks.mine.mockResolvedValue(
      viewWith({
        review: { status: 'suspended', reviewedAt: null },
        canManage: false,
      }),
    );
    renderPage();

    expect(await screen.findByText('Suspended')).toBeTruthy();
    expect(screen.getByText(/cannot invite members/)).toBeTruthy();
  });

  it('tells a member of an approved organisation who manages it', async () => {
    mocks.mine.mockResolvedValue(
      viewWith({ role: 'member', canManage: false, members: [] }),
    );
    renderPage();

    expect(
      await screen.findByText(
        'Owners and admins manage the members and invitations.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Members' })).toBeNull();
  });

  it('says so when the organisation is not the reader’s, and offers a retry on failure', async () => {
    mocks.mine.mockRejectedValueOnce(
      new AppError('organisation_not_found', 'Organisation not found'),
    );
    renderPage();
    expect(
      await screen.findByText(/not found, or you are not one of its members/),
    ).toBeTruthy();
    cleanup();

    mocks.mine.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    expect(
      await screen.findByText('Your organisation could not be loaded.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('shows the page in Arabic', async () => {
    mocks.mine.mockResolvedValue(ownerView);
    renderPage('ar');

    expect(await screen.findByText('معتمدة')).toBeTruthy();
    expect(screen.getByText('الأعضاء')).toBeTruthy();
    expect(screen.getByText('المالك')).toBeTruthy();
    expect(screen.getByText(/^اعتُمدت في 1 /)).toBeTruthy();
  });
});
