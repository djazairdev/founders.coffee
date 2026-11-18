import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HackathonRecordOffer } from './HackathonRecordOffer';

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), isError: false }));

vi.mock('../team-hooks', () => ({
  useSetRecordShown: () => ({
    mutate: mocks.mutate,
    isPending: false,
    isError: mocks.isError,
  }),
}));

afterEach(() => {
  cleanup();
  mocks.mutate.mockClear();
  mocks.isError = false;
});

describe('HackathonRecordOffer', () => {
  it('asks first, and turning it on sends yes', () => {
    render(
      <HackathonRecordOffer eventId="evt_1" isShown={false} locale="en" />,
    );

    expect(
      screen.getByRole('heading', { name: 'Show this on your profile?' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show on my profile' }));
    expect(mocks.mutate).toHaveBeenCalledWith(true);
  });

  it('says it is shown and offers to take it back', () => {
    render(<HackathonRecordOffer eventId="evt_1" isShown locale="ar" />);

    expect(screen.getByText('هاكاثوناتك ظاهرة في ملفك الشخصي.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء من ملفي' }));
    expect(mocks.mutate).toHaveBeenCalledWith(false);
  });

  it('says when the answer did not save', () => {
    mocks.isError = true;
    render(
      <HackathonRecordOffer eventId="evt_1" isShown={false} locale="fr" />,
    );

    expect(
      screen.getByText('L’enregistrement a échoué. Réessayez.'),
    ).toBeTruthy();
  });
});
