import { describe, expect, it } from 'vitest';

import {
  checkConfirmationNote,
  checkPrize,
  emptyPrize,
  majorText,
  minorUnitsOf,
  prizeDraftOf,
} from './hackathon-prize-form';

const complete = {
  ...emptyPrize(),
  title: 'First prize',
  description: 'Mentoring and cloud credits for the winning team.',
  providerName: 'Algiers Builders',
};

describe('the prize form (B-HKN-14)', () => {
  it('reads an amount in major units as integer minor units', () => {
    expect(minorUnitsOf('50000')).toBe(5_000_000);
    expect(minorUnitsOf('1500.5')).toBe(150_050);
    expect(minorUnitsOf('1500,50')).toBe(150_050);
    expect(minorUnitsOf('50 000')).toBe(5_000_000);
    expect(minorUnitsOf('٥٠٠٠٠')).toBe(5_000_000);
    expect(minorUnitsOf('0.07')).toBe(7);
    expect(minorUnitsOf('12.345')).toBeNull();
    expect(minorUnitsOf('-5')).toBeNull();
    expect(minorUnitsOf('5e3')).toBeNull();
    expect(minorUnitsOf('')).toBeNull();
  });

  it('writes a value back the way an organiser types it', () => {
    expect(majorText({ amount_minor: 5_000_000, currency: 'DZD' })).toBe(
      '50000',
    );
    expect(majorText({ amount_minor: 150_005, currency: 'DZD' })).toBe(
      '1500.05',
    );
  });

  it('opens a saved prize as it was saved', () => {
    expect(
      prizeDraftOf({
        id: 'prz_1',
        trackId: null,
        place: 2,
        title: 'Runner-up',
        description: 'A month of coworking for the team.',
        providerName: 'Hydra Hub',
        value: { amount_minor: 2_000_050, currency: 'DZD' },
        confirmation: null,
      }),
    ).toEqual({
      trackId: '',
      place: '2',
      title: 'Runner-up',
      description: 'A month of coworking for the team.',
      providerName: 'Hydra Hub',
      value: '20000.50',
    });
  });

  it('values a complete prize in the hackathon’s currency, or leaves it without one', () => {
    expect(checkPrize({ ...complete, value: '50000' }, 'DZD', 'en')).toEqual({
      ok: true,
      prize: {
        trackId: null,
        place: 1,
        title: 'First prize',
        description: 'Mentoring and cloud credits for the winning team.',
        providerName: 'Algiers Builders',
        value: { amount_minor: 5_000_000, currency: 'DZD' },
      },
    });
    const check = checkPrize(complete, 'SAR', 'en');
    expect(check.ok && check.prize.value).toBeNull();
  });

  it('names every field holding a prize back, the first one first', () => {
    const check = checkPrize(
      { ...emptyPrize(), place: '11', description: 'Short', value: 'lots' },
      'DZD',
      'en',
    );
    if (check.ok) throw new Error('expected a refusal');
    expect(check.first).toBe('place');
    expect(check.errors).toEqual({
      place: 'Enter a place from 1 to 10.',
      title: 'Name the prize in 3 to 100 characters.',
      description: 'Describe it in 10 to 1,000 characters.',
      providerName: 'Name who provides it in 2 to 100 characters.',
      value: 'Enter an amount such as 50000 or 1500.50.',
    });
  });

  it('refuses a zero value rather than saving a prize worth nothing', () => {
    const check = checkPrize({ ...complete, value: '0' }, 'DZD', 'fr');
    expect(check.ok ? null : check.errors.value).toBe(
      'Saisissez un montant comme 50000 ou 1500,50.',
    );
  });

  it('takes a confirmation note of ten characters or more', () => {
    expect(checkConfirmationNote('  Signed letter, 20 Oct.  ', 'en')).toEqual({
      note: 'Signed letter, 20 Oct.',
    });
    expect(checkConfirmationNote('Yes', 'ar')).toEqual({
      error: 'اكتب 10 أحرف على الأقل عن طريقة التأكيد.',
    });
  });
});
