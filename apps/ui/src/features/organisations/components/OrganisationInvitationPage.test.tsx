import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import { markets } from '../my-organisation.fixtures';
import type { InvitationView } from '../types';
import { OrganisationInvitationPage } from './OrganisationInvitationPage';

const mocks = vi.hoisted(() => ({
  invitation: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
}));

vi.mock('../api', () => ({ organisationsApi: mocks }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const pending: InvitationView = {
  id: 'inv_1',
  organisationName: 'Oran Makers',
  organisationSlug: 'oran-makers',
  marketCode: 'DZ',
  role: 'admin',
  inviterName: 'Amina Kaci',
  expiresAt: new Date('2099-10-29T09:00:00Z'),
  state: 'pending',
  isEmailVerified: true,
};

afterEach(() => {
  cleanup();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

const renderPage = (locale: Locale = 'en') =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <OrganisationInvitationPage
        invitationId="inv_1"
        locale={locale}
        markets={markets}
      />
    </QueryClientProvider>,
  );

describe('OrganisationInvitationPage (B-ORG-10)', () => {
  it('shows who invited the reader, as what, until when', async () => {
    mocks.invitation.mockResolvedValue(pending);
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Oran Makers' }),
    ).toBeTruthy();
    expect(mocks.invitation).toHaveBeenCalledWith('inv_1');
    expect(
      screen.getByText(/invites you to help run it, as an admin\./),
    ).toBeTruthy();
    expect(screen.getByText(/Sent by/).textContent).toContain('Amina Kaci');
    expect(screen.getByText('Expires October 29, 2099')).toBeTruthy();
  });

  it('accepts, then shows the organisation the reader joined', async () => {
    mocks.invitation
      .mockResolvedValueOnce(pending)
      .mockResolvedValue({ ...pending, state: 'accepted' });
    mocks.acceptInvitation.mockResolvedValue({ organisationId: 'org_1' });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    expect(await screen.findByText(/You joined/)).toBeTruthy();
    expect(mocks.acceptInvitation).toHaveBeenCalledWith('inv_1');
    expect(
      screen.getByRole('link', { name: 'See your organisation' }),
    ).toBeTruthy();
  });

  it('declines, and says that it did', async () => {
    mocks.invitation
      .mockResolvedValueOnce(pending)
      .mockResolvedValue({ ...pending, state: 'declined' });
    mocks.declineInvitation.mockResolvedValue({ organisationId: 'org_1' });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));

    expect(
      await screen.findByText('You declined this invitation.'),
    ).toBeTruthy();
    expect(mocks.declineInvitation).toHaveBeenCalledWith('inv_1');
  });

  it('says when an answer could not be saved', async () => {
    mocks.invitation.mockResolvedValue(pending);
    mocks.acceptInvitation.mockRejectedValue(new Error('offline'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    expect(
      await screen.findByText('Your answer could not be saved. Try again.'),
    ).toBeTruthy();
  });

  it('asks for a verified address before an answer', async () => {
    mocks.invitation.mockResolvedValue({ ...pending, isEmailVerified: false });
    renderPage();

    expect(
      await screen.findByText(
        'Verify your email address to answer this invitation.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Go to your account' }),
    ).toBeTruthy();
  });

  it.each([
    ['expired', /has expired/],
    ['cancelled', /cancelled this invitation/],
    ['unavailable', /cannot take new members/],
    ['already_member', /You already belong to/],
  ] as const)('shows a %s invitation without answers', async (state, text) => {
    mocks.invitation.mockResolvedValue({ ...pending, state });
    renderPage();

    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  it('says so when the invitation is not the reader’s, and offers a retry on failure', async () => {
    mocks.invitation.mockRejectedValueOnce(
      new AppError('organisation_invitation_not_found', 'Not found'),
    );
    renderPage();
    expect(
      await screen.findByText(/This invitation was not found/),
    ).toBeTruthy();
    cleanup();

    mocks.invitation.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    expect(
      await screen.findByText('The invitation could not be loaded.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mocks.invitation).toHaveBeenCalledTimes(3));
  });

  it('shows the invitation in Arabic', async () => {
    mocks.invitation.mockResolvedValue({ ...pending, role: 'member' });
    renderPage('ar');

    expect(await screen.findByRole('button', { name: 'قبول' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'رفض' })).toBeTruthy();
    expect(screen.getByText(/للانضمام إليها، عضوًا فيها/)).toBeTruthy();
  });
});
