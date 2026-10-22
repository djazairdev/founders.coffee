import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@founders-coffee/core';

import { markets, ownerView } from '../my-organisation.fixtures';
import { MyOrganisationPage } from './MyOrganisationPage';

const mocks = vi.hoisted(() => ({
  mine: vi.fn(),
  invite: vi.fn(),
  cancelInvitation: vi.fn(),
  removeMember: vi.fn(),
}));

vi.mock('../api', () => ({ organisationsApi: mocks }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <a href="#" className={className}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  mocks.mine.mockResolvedValue(ownerView);
});

afterEach(() => {
  cleanup();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

const renderPage = async () => {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MyOrganisationPage slug="oran-makers" locale="en" markets={markets} />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Oran Makers' });
};

const typeEmail = (value: string) =>
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value },
  });

const sendInvitation = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

describe('MyOrganisationPage actions (B-ORG-09)', () => {
  it('invites an address as an admin, and says where it went', async () => {
    mocks.invite.mockResolvedValue({ invitationId: 'inv_new' });
    await renderPage();

    typeEmail('  New.Person@Example.ORG ');
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'admin' },
    });
    sendInvitation();

    expect(
      await screen.findByText(/Invitation sent to .*It is valid for 7 days\./),
    ).toBeTruthy();
    expect(mocks.invite).toHaveBeenCalledWith({
      organisationId: 'org_1',
      email: 'new.person@example.org',
      role: 'admin',
    });
    expect(
      (screen.getByLabelText('Email address') as HTMLInputElement).value,
    ).toBe('');
    await waitFor(() => expect(mocks.mine).toHaveBeenCalledTimes(2));
  });

  it('keeps an address that is not one on the field, without asking the server', async () => {
    await renderPage();

    typeEmail('not an address');
    sendInvitation();

    const field = screen.getByLabelText('Email address');
    expect(screen.getByText('Enter a full email address.')).toBeTruthy();
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(field);
    expect(mocks.invite).not.toHaveBeenCalled();
  });

  it('says when the address already belongs to the organisation, or too much was sent', async () => {
    mocks.invite.mockRejectedValueOnce(
      new AppError('organisation_already_member', 'Already a member'),
    );
    await renderPage();

    typeEmail('amina@example.org');
    sendInvitation();
    expect(
      await screen.findByText(
        'This address already belongs to the organisation.',
      ),
    ).toBeTruthy();

    mocks.invite.mockRejectedValueOnce(new AppError('rate_limited', 'Slow'));
    sendInvitation();
    expect(await screen.findByText(/many changes recently/)).toBeTruthy();
  });

  it('removes a member only once the dialog is confirmed', async () => {
    mocks.removeMember.mockResolvedValue({ memberId: 'mem_admin' });
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Yacine Bel' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove this member?' });
    expect(dialog.textContent).toContain('Yacine Bel');
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(mocks.removeMember).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Yacine Bel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(mocks.removeMember).toHaveBeenCalledWith({
        organisationId: 'org_1',
        memberId: 'mem_admin',
      }),
    );
  });

  it('cancels an invitation, and says so when the change fails', async () => {
    mocks.cancelInvitation.mockRejectedValue(new Error('offline'));
    await renderPage();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cancel the invitation to waiting@example.org',
      }),
    );

    await waitFor(() =>
      expect(mocks.cancelInvitation).toHaveBeenCalledWith({
        organisationId: 'org_1',
        invitationId: 'inv_waiting',
      }),
    );
    expect(
      await screen.findByText('The change could not be saved. Try again.'),
    ).toBeTruthy();
  });
});
