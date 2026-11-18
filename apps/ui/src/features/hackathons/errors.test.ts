import { describe, expect, it } from 'vitest';

import { AppError } from '@founders-coffee/core';

import { isHackathonsDisabled } from './errors';

describe('isHackathonsDisabled', () => {
  it('recognises the refusal of a market with hackathons off', () => {
    expect(
      isHackathonsDisabled(new AppError('hackathons_disabled', 'off')),
    ).toBe(true);
  });

  it('reads the code a serialized error carries over the wire', () => {
    expect(isHackathonsDisabled({ code: 'hackathons_disabled' })).toBe(true);
  });

  it('leaves every other failure to the screen’s own error state', () => {
    expect(isHackathonsDisabled(new AppError('rate_limited', 'slow'))).toBe(
      false,
    );
    expect(isHackathonsDisabled(new Error('network'))).toBe(false);
    expect(isHackathonsDisabled(null)).toBe(false);
  });
});
