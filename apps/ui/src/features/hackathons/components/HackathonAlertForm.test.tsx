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

import { AppError } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

const mocks = vi.hoisted(() => ({
  join: vi.fn(),
  user: null as { email: string } | null,
  config: { turnstileSiteKey: 'site-key', isTurnstileBypassed: false } as {
    turnstileSiteKey: string | null;
    isTurnstileBypassed: boolean;
  },
}));

vi.mock('../api', () => ({
  hackathonsApi: { joinHackathonInterest: mocks.join },
}));

vi.mock('../../auth/hooks', () => ({
  usePublicAuthConfig: () => ({ data: mocks.config }),
}));

vi.mock('../../../lib/app-providers', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    params,
  }: {
    children: ReactNode;
    className?: string;
    params: { locale: string; market: string };
  }) =>
    createElement(
      'a',
      { href: `/${params.locale}/${params.market}`, className },
      children,
    ),
}));

vi.mock('@founders-coffee/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Turnstile: ({
    action,
    resetKey,
    onToken,
  }: {
    action: string;
    resetKey: number;
    onToken: (token: string) => void;
  }) => (
    <button
      type="button"
      data-testid="turnstile"
      data-action={action}
      data-reset={resetKey}
      onClick={() => onToken(`token-${resetKey}`)}
    >
      verify
    </button>
  ),
}));

import { HackathonAlertForm } from './HackathonAlertForm';

const renderForm = (locale: Locale = 'en') =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <HackathonAlertForm locale={locale} marketCode="DZ" />
    </QueryClientProvider>,
  );

const field = () => screen.getByRole<HTMLInputElement>('textbox');
const submit = () => screen.getByRole('button', { name: 'Notify me' });

afterEach(() => {
  cleanup();
  mocks.join.mockReset();
  mocks.user = null;
  mocks.config = { turnstileSiteKey: 'site-key', isTurnstileBypassed: false };
});

describe('HackathonAlertForm', () => {
  it('labels the field, and says what the email is for with a link to the privacy policy', () => {
    renderForm();

    const input = screen.getByLabelText('Tell me when registration opens');
    const consent = document.getElementById(
      input.getAttribute('aria-describedby') ?? '',
    );
    expect(consent?.textContent).toBe(
      'We’ll send one email, when registration opens, and nothing else. See our privacy policy.',
    );
    expect(
      screen.getByRole('link', { name: 'privacy policy' }).getAttribute('href'),
    ).toBe('/en/privacy');
  });

  it('prefills a signed-in member’s email, and lets them change it', () => {
    mocks.user = { email: 'amina@example.dz' };
    renderForm();

    expect(field().value).toBe('amina@example.dz');
    fireEvent.change(field(), { target: { value: '' } });
    expect(field().value).toBe('');
  });

  it('waits for the human check, on its own action, before it can send', () => {
    renderForm();

    expect(submit().hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('turnstile').dataset.action).toBe(
      'join_hackathon_interest',
    );
    fireEvent.click(screen.getByTestId('turnstile'));
    expect(submit().hasAttribute('disabled')).toBe(false);
  });

  it('sends the address with the market, language and token, and confirms', async () => {
    mocks.join.mockResolvedValue({ status: 'received' });
    renderForm('fr');
    fireEvent.change(field(), { target: { value: ' Amina@Example.DZ ' } });
    fireEvent.click(screen.getByTestId('turnstile'));
    fireEvent.click(screen.getByRole('button', { name: 'Notifiez-moi' }));

    expect(
      await screen.findByText(
        'C’est noté. Nous vous écrirons à l’ouverture des inscriptions.',
      ),
    ).toBeTruthy();
    expect(mocks.join).toHaveBeenCalledWith({
      data: {
        email: 'amina@example.dz',
        marketCode: 'DZ',
        locale: 'fr',
        turnstileToken: 'token-0',
      },
    });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('sends without a token where the check is switched off', async () => {
    mocks.config = { turnstileSiteKey: null, isTurnstileBypassed: true };
    mocks.join.mockResolvedValue({ status: 'received' });
    renderForm();
    fireEvent.change(field(), { target: { value: 'amina@example.dz' } });
    fireEvent.click(submit());

    await waitFor(() => expect(mocks.join).toHaveBeenCalledTimes(1));
    expect(mocks.join.mock.calls[0]?.[0].data.turnstileToken).toBeUndefined();
    expect(screen.queryByTestId('turnstile')).toBeNull();
  });

  it('asks for a valid address without sending anything', () => {
    renderForm();
    fireEvent.click(screen.getByTestId('turnstile'));
    fireEvent.change(field(), { target: { value: 'not-an-email' } });
    fireEvent.click(submit());

    expect(screen.getByText('Please enter a valid email')).toBeTruthy();
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(mocks.join).not.toHaveBeenCalled();
  });

  it('says something went wrong, and asks for a fresh check before the next try', async () => {
    mocks.join.mockRejectedValue(new Error('network'));
    renderForm();
    fireEvent.change(field(), { target: { value: 'amina@example.dz' } });
    fireEvent.click(screen.getByTestId('turnstile'));
    fireEvent.click(submit());

    expect(
      await screen.findByText('Something went wrong. Try again.'),
    ).toBeTruthy();
    expect(screen.getByTestId('turnstile').dataset.reset).toBe('1');
    expect(submit().hasAttribute('disabled')).toBe(true);
  });

  it('reads a refused address as an invalid one', async () => {
    mocks.join.mockRejectedValue(new AppError('validation_failed', 'Invalid'));
    renderForm();
    fireEvent.change(field(), { target: { value: 'amina@example.dz' } });
    fireEvent.click(screen.getByTestId('turnstile'));
    fireEvent.click(submit());

    expect(await screen.findByText('Please enter a valid email')).toBeTruthy();
  });

  it('speaks Arabic', () => {
    renderForm('ar');

    expect(screen.getByLabelText('أعلِمني عند فتح التسجيل')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'سياسة الخصوصية' })).toBeTruthy();
  });
});
