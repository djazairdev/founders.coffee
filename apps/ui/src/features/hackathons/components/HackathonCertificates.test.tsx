import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HackathonCertificates } from './HackathonCertificates';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    params,
    children,
    'aria-label': label,
  }: {
    params: { locale: string; code: string };
    children: ReactNode;
    'aria-label': string;
  }) => (
    <a href={`/${params.locale}/c/${params.code}`} aria-label={label}>
      {children}
    </a>
  ),
}));

const CERTIFICATES = [
  { code: 'code-won', kind: 'winner' as const, placement: 'First prize' },
  { code: 'code-took-part', kind: 'participant' as const, placement: null },
];

const writeText = vi.fn();

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  cleanup();
  writeText.mockReset();
});

describe('HackathonCertificates (B-CRT-03)', () => {
  it('shows nothing without a certificate', () => {
    const { container } = render(
      <HackathonCertificates certificates={[]} locale="en" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('links each certificate, named so a screen reader can tell them apart', () => {
    render(<HackathonCertificates certificates={CERTIFICATES} locale="en" />);

    expect(
      screen
        .getByRole('link', { name: 'Winner’s certificate' })
        .getAttribute('href'),
    ).toBe('/en/c/code-won');
    expect(screen.getByText('First prize')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Certificate of participation' })
        .getAttribute('href'),
    ).toBe('/en/c/code-took-part');
  });

  it('copies the address of the certificate it sits beside', async () => {
    writeText.mockResolvedValue(undefined);
    render(<HackathonCertificates certificates={CERTIFICATES} locale="en" />);

    const button = screen.getByRole('button', {
      name: 'Copy the link to Certificate of participation',
    });
    fireEvent.click(button);

    await waitFor(() => expect(button.textContent).toBe('Copied'));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/en/c/code-took-part`,
    );
    expect(
      screen.getByRole('button', {
        name: 'Copy the link to Winner’s certificate',
      }).textContent,
    ).toBe('Copy link');
  });

  it('says so when the browser refuses to copy', async () => {
    writeText.mockRejectedValue(new Error('Denied'));
    render(<HackathonCertificates certificates={CERTIFICATES} locale="en" />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Copy the link to Winner’s certificate',
      }),
    );

    expect(
      await screen.findByText(/The link could not be copied/u),
    ).toBeTruthy();
  });
});
