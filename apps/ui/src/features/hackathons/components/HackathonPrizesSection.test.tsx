import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';

import type { HackathonDraftView, HackathonPrizeView } from '../api';
import { draftView, savedDetails } from '../hackathon-details-form.fixtures';
import { HackathonPrizesSection } from './HackathonPrizesSection';

const TRACK = `trk_${'a'.repeat(32)}`;

type Options = { onSuccess?: () => void; onError?: (error: unknown) => void };

const mutation = () => ({
  isPending: false,
  mutate: vi.fn((_request: unknown, options?: Options) =>
    options?.onSuccess?.(),
  ),
});

const mocks = vi.hoisted(() => ({
  add: null as unknown as ReturnType<typeof mutation>,
  change: null as unknown as ReturnType<typeof mutation>,
  remove: null as unknown as ReturnType<typeof mutation>,
  confirm: null as unknown as ReturnType<typeof mutation>,
}));

vi.mock('../hooks', () => ({
  useAddHackathonPrize: () => mocks.add,
  useChangeHackathonPrize: () => mocks.change,
  useRemoveHackathonPrize: () => mocks.remove,
  useConfirmHackathonPrize: () => mocks.confirm,
}));

const unconfirmed: HackathonPrizeView = {
  id: 'prz_mentoring',
  trackId: TRACK,
  place: 2,
  title: 'Mentoring',
  description: 'Six weeks of mentoring with a founder.',
  providerName: 'Dev Code Club',
  value: null,
  confirmation: null,
};

const confirmed: HackathonPrizeView = {
  id: 'prz_first',
  trackId: null,
  place: 1,
  title: 'First prize',
  description: 'Mentoring and cloud credits for the winning team.',
  providerName: 'Algiers Builders',
  value: { amount_minor: 5_000_000, currency: 'DZD' },
  confirmation: {
    confirmedAt: Date.parse('2026-10-20T10:00:00Z'),
    note: 'Signed letter from their CEO.',
  },
};

const withPrizes = (
  prizes: readonly HackathonPrizeView[],
  changes: Partial<HackathonDraftView> = {},
) =>
  draftView({
    details: savedDetails,
    tracks: [
      {
        id: TRACK,
        kind: 'founder_problem',
        title: 'Payments',
        brief: 'Build a tool that a founder in Algiers would use every week.',
        partnerName: null,
        sourceUrls: [],
      },
    ],
    prizes,
    ...changes,
  });

const renderSection = (draft: HackathonDraftView, locale: Locale = 'en') =>
  render(
    <HackathonPrizesSection
      draft={draft}
      locale={locale}
      timeZone="Africa/Algiers"
    />,
  );

const type = (label: string, value: string, exact = true) =>
  fireEvent.change(screen.getByLabelText(label, { exact }), {
    target: { value },
  });

const resetMocks = () => {
  Object.assign(mocks, {
    add: mutation(),
    change: mutation(),
    remove: mutation(),
    confirm: mutation(),
  });
};

resetMocks();

afterEach(() => {
  cleanup();
  resetMocks();
});

describe('HackathonPrizesSection (B-HKN-14)', () => {
  it('waits for the rules to be saved first', () => {
    renderSection(draftView());

    expect(
      screen.getByText(
        'Save the rules and who can take part first, then add prizes.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add a prize' })).toBeNull();
  });

  it('adds a prize for a track, valued in the hackathon’s currency', () => {
    renderSection(withPrizes([]));
    expect(
      screen.getByText('No prizes yet. Prizes are optional.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add a prize' }));
    fireEvent.change(screen.getByLabelText('Track'), {
      target: { value: TRACK },
    });
    type('Prize', 'First prize');
    type('What the winners receive', 'Mentoring and cloud credits.');
    type('Provided by', 'Algiers Builders');
    type('Value in DZD', '50 000', false);
    fireEvent.click(screen.getByRole('button', { name: 'Save the prize' }));

    expect(mocks.add.mutate).toHaveBeenCalledWith(
      {
        eventId: 'evt_draft',
        version: 1,
        prize: {
          trackId: TRACK,
          place: 1,
          title: 'First prize',
          description: 'Mentoring and cloud credits.',
          providerName: 'Algiers Builders',
          value: { amount_minor: 5_000_000, currency: 'DZD' },
        },
      },
      expect.anything(),
    );
    expect(screen.getByText('Prize saved.')).toBeTruthy();
  });

  it('holds back an incomplete prize and says why', () => {
    renderSection(withPrizes([]));

    fireEvent.click(screen.getByRole('button', { name: 'Add a prize' }));
    type('Prize', 'P');
    fireEvent.click(screen.getByRole('button', { name: 'Save the prize' }));

    expect(mocks.add.mutate).not.toHaveBeenCalled();
    expect(
      screen.getByText('Name the prize in 3 to 100 characters.'),
    ).toBeTruthy();
    expect(document.activeElement?.id).toBe('hackathon-prize-new-title');
  });

  it('shows an unconfirmed prize as not public, and withdraws it', () => {
    renderSection(withPrizes([unconfirmed]));

    expect(screen.getByText('Not public yet')).toBeTruthy();
    expect(screen.getByText('Payments')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Withdraw the prize Mentoring' }),
    );

    expect(mocks.remove.mutate).toHaveBeenCalledWith(
      { eventId: 'evt_draft', version: 1, prizeId: 'prz_mentoring' },
      expect.anything(),
    );
    expect(screen.getByText('Prize withdrawn.')).toBeTruthy();
  });

  it('records a confirmation with a note of how it was given', () => {
    renderSection(withPrizes([unconfirmed]));

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Record confirmation for the prize Mentoring',
      }),
    );
    type('How the provider confirmed', 'Yes');
    fireEvent.click(
      screen.getByRole('button', { name: 'Record confirmation' }),
    );
    expect(mocks.confirm.mutate).not.toHaveBeenCalled();
    expect(
      screen.getByText('Write at least 10 characters on how it was confirmed.'),
    ).toBeTruthy();

    type('How the provider confirmed', 'Email from the club, 20 Oct.');
    fireEvent.click(
      screen.getByRole('button', { name: 'Record confirmation' }),
    );
    expect(mocks.confirm.mutate).toHaveBeenCalledWith(
      {
        eventId: 'evt_draft',
        version: 1,
        prizeId: 'prz_mentoring',
        note: 'Email from the club, 20 Oct.',
      },
      expect.anything(),
    );
  });

  it('shows a confirmed prize with its private note, never withdrawn, warned before rewording', () => {
    renderSection(withPrizes([confirmed]));

    expect(screen.getByText('Confirmed')).toBeTruthy();
    expect(screen.getByText('Whole hackathon')).toBeTruthy();
    expect(screen.getByText(/^Worth .*50,000/u)).toBeTruthy();
    expect(screen.getByText('Signed letter from their CEO.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Withdraw/u })).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Change the prize First prize' }),
    );
    expect(
      screen.getByText(
        'A new prize, value or provider takes the confirmation away until the provider confirms again.',
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByLabelText('Value in DZD', {
          exact: false,
        }) as HTMLInputElement
      ).value,
    ).toBe('50000');
  });

  it('once registration opens, still adds and confirms but keeps saved prizes', () => {
    renderSection(withPrizes([unconfirmed], { stage: 'locked' }));

    expect(
      screen.getByText(
        'Registration is open: you can still add prizes and record confirmations, but saved prizes stay as they are.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Change/u })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Withdraw/u })).toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Record confirmation for the prize Mentoring',
      }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add a prize' })).toBeTruthy();
  });

  it('reads in Arabic', () => {
    renderSection(withPrizes([confirmed]), 'ar');

    expect(screen.getByRole('heading', { name: 'الجوائز' })).toBeTruthy();
    expect(screen.getByText('مؤكَّدة')).toBeTruthy();
    expect(screen.getByText('الهاكاثون كله')).toBeTruthy();
  });
});
