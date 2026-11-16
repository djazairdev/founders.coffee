import { describe, expect, it } from 'vitest';

import { eventUpdateSchema } from './schemas.js';

const validUpdate = (overrides: Record<string, unknown> = {}) => {
  const startsAt = Date.now() + 24 * 60 * 60_000;
  return {
    expectedVersion: 3,
    title: 'Founder coffee session',
    description: 'A focused discussion for local founders.',
    venueName: 'Café des Délices',
    startsAt,
    endsAt: startsAt + 60 * 60_000,
    languages: ['fr'],
    ...overrides,
  };
};

describe('eventUpdateSchema', () => {
  it('accepts an edit that moves the pin, carrying both halves of the point', () => {
    expect(
      eventUpdateSchema.safeParse(
        validUpdate({ latitude: 36.7538, longitude: 3.0588 }),
      ).success,
    ).toBe(true);
  });

  it('accepts an edit that carries no point at all, which most rows have', () => {
    expect(
      eventUpdateSchema.safeParse(validUpdate()).success,
      'sending neither coordinate means the point is unchanged, so a meetup that never had one stays editable',
    ).toBe(true);
  });

  it.each([
    ['latitude alone', { latitude: 36.7538 }],
    ['longitude alone', { longitude: 3.0588 }],
  ])('refuses half a venue point: %s', (_label, half) => {
    const result = eventUpdateSchema.safeParse(validUpdate(half));

    expect(result.success).toBe(false);
    if (!result.success)
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path[0] === 'latitude' &&
            issue.message ===
              'A venue point needs both a latitude and a longitude',
        ),
        'one coordinate on its own is indistinguishable from a pin dragged into the sea, so it cannot be accepted as an edit',
      ).toBe(true);
  });

  it('still applies the schedule rules an edit shares with a new meetup', () => {
    const startsAt = Date.now() + 24 * 60 * 60_000;

    expect(
      eventUpdateSchema.safeParse(
        validUpdate({ startsAt, endsAt: startsAt - 60_000 }),
      ).success,
    ).toBe(false);
  });
});
