import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Locale } from '@founders-coffee/i18n';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isSuccess: false,
  config: { turnstileSiteKey: 'site-key', isTurnstileBypassed: false } as {
    turnstileSiteKey: string | null;
    isTurnstileBypassed: boolean;
  },
}));

vi.mock('../hooks', () => ({
  useJoinWaitlist: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
    isSuccess: mocks.isSuccess,
  }),
}));

vi.mock('../../auth/hooks', () => ({
  usePublicAuthConfig: () => ({ data: mocks.config }),
}));

vi.mock('@founders-coffee/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Turnstile: ({
    language,
    onToken,
  }: {
    language: string;
    onToken: (token: string) => void;
  }) => (
    <button
      data-testid="waitlist-turnstile"
      data-language={language}
      onClick={() => onToken('tok')}
    >
      verify
    </button>
  ),
}));

vi.mock('../../../components/company/LegalNotice', () => ({
  LegalNotice: () => null,
}));

import { WaitlistForm } from './WaitlistForm';

const renderForm = (locale: Locale = 'en', cityName = 'Algiers') =>
  render(
    <WaitlistForm
      locale={locale}
      marketCode="DZ"
      cityCode="1"
      cityName={cityName}
    />,
  );

const typeEmail = () =>
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'founder@example.dz' },
  });

describe('WaitlistForm bot protection (AR-06)', () => {
  afterEach(() => {
    cleanup();
    mocks.config = { turnstileSiteKey: 'site-key', isTurnstileBypassed: false };
    mocks.isSuccess = false;
    vi.clearAllMocks();
  });

  it('will not submit before a Turnstile response is obtained', () => {
    renderForm();
    typeEmail();

    const submit = screen
      .getByRole('textbox')
      .closest('form')
      ?.querySelector('button[type="submit"]');
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(screen.getByRole('textbox').closest('form') as Element);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('submits the token once verification completes', async () => {
    mocks.mutateAsync.mockResolvedValue({ status: 'joined' });
    renderForm();
    typeEmail();

    fireEvent.click(screen.getByTestId('waitlist-turnstile'));
    fireEvent.submit(screen.getByRole('textbox').closest('form') as Element);

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      data: {
        email: 'founder@example.dz',
        marketCode: 'DZ',
        cityCode: '1',
        locale: 'en',
        turnstileToken: 'tok',
      },
    });
  });

  it('submits without a token only when the deployment bypasses Turnstile', () => {
    mocks.config = { turnstileSiteKey: null, isTurnstileBypassed: true };
    mocks.mutateAsync.mockResolvedValue({ status: 'joined' });
    renderForm();
    typeEmail();

    expect(screen.queryByTestId('waitlist-turnstile')).toBeNull();
    fireEvent.submit(screen.getByRole('textbox').closest('form') as Element);
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it.each(['ar', 'fr'] as const)(
    'challenges in %s, the locale the page is in rather than the browser\u2019s',
    (locale) => {
      renderForm(locale);

      expect(screen.getByTestId('waitlist-turnstile').dataset.language).toBe(
        locale,
      );
    },
  );

  it('lets a saved address be offered, and reads it left to right', () => {
    renderForm();
    const email = screen.getByRole('textbox');

    expect(
      email.getAttribute('autocomplete'),
      'this is the one field the hero asks for, and an empty autocomplete stops a password manager offering the address it already holds',
    ).toBe('email');
    expect(
      email.getAttribute('dir'),
      'the shared Input writes an email field left to right, so the address reads correctly on an Arabic page',
    ).toBe('ltr');
  });

  it('keeps the field full height when the form stacks on a phone', () => {
    renderForm();
    const email = screen.getByRole('textbox');

    expect(
      email.classList.contains('flex-1'),
      'below sm the form is a column, where flex-1 makes the height grow from zero and the field collapses to its text',
    ).toBe(false);
    expect(email.classList.contains('sm:flex-1')).toBe(true);
  });
});

describe('WaitlistForm confirmation', () => {
  afterEach(() => {
    cleanup();
    mocks.isSuccess = false;
  });

  it('promises the first meetup au Caire once the address is on the list', () => {
    mocks.isSuccess = true;
    renderForm('fr', 'Le Caire');

    expect(screen.getByText(/Vous êtes sur la liste/u).textContent).toBe(
      '✓ Vous êtes sur la liste ! Nous vous préviendrons dès que la prochaine rencontre au Caire sera publiée.',
    );
  });
});
