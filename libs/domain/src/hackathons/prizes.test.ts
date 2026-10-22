import { describe, expect, it } from 'vitest';

import {
  HACKATHON_PRIZE_CONFIRMATION_NOTE_MAX_LENGTH,
  HACKATHON_PRIZE_PLACE_MAX,
  hackathonPrizeConfirmationSchema,
  hackathonPrizeSchema,
} from './prizes.js';

const prize = {
  trackId: null,
  place: 1,
  title: 'First place',
  description: 'A year of cloud credits for the winning team.',
  providerName: 'Djazair Cloud',
  value: { amount_minor: 50_000_000, currency: 'DZD' },
};

const accepts = (input: object) =>
  hackathonPrizeSchema.safeParse({ ...prize, ...input }).success;

describe('hackathon prizes (B-HKN-04)', () => {
  it('takes an overall prize, or one for a track, with or without a value', () => {
    expect(accepts({})).toBe(true);
    expect(accepts({ trackId: `trk_${'a'.repeat(32)}` })).toBe(true);
    expect(accepts({ value: null })).toBe(true);
  });

  it('refuses a place outside one to the last place', () => {
    expect(accepts({ place: 0 })).toBe(false);
    expect(accepts({ place: 1.5 })).toBe(false);
    expect(accepts({ place: HACKATHON_PRIZE_PLACE_MAX })).toBe(true);
    expect(accepts({ place: HACKATHON_PRIZE_PLACE_MAX + 1 })).toBe(false);
  });

  it('holds the value to whole, positive minor units in a known currency', () => {
    expect(accepts({ value: { amount_minor: 0, currency: 'DZD' } })).toBe(
      false,
    );
    expect(accepts({ value: { amount_minor: 10.5, currency: 'DZD' } })).toBe(
      false,
    );
    expect(accepts({ value: { amount_minor: 100, currency: 'XYZ' } })).toBe(
      false,
    );
  });

  it('refuses a track id that is not an id, and fields it does not know', () => {
    expect(accepts({ trackId: 'track-1' })).toBe(false);
    expect(accepts({ confirmedAt: new Date() })).toBe(false);
    expect(accepts({ providerName: ' ' })).toBe(false);
  });
});

describe('a prize confirmation note (B-HKN-10)', () => {
  const takes = (note: string) =>
    hackathonPrizeConfirmationSchema.safeParse(note).success;

  it('needs a note that says who confirmed, when and how, trimmed', () => {
    expect(takes('Signed letter from Amina, Djazair Cloud, 3 Nov')).toBe(true);
    expect(takes('   Email   ')).toBe(false);
    expect(
      takes('x'.repeat(HACKATHON_PRIZE_CONFIRMATION_NOTE_MAX_LENGTH + 1)),
    ).toBe(false);
  });
});
