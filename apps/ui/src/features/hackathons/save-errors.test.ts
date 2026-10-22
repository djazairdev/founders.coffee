import { describe, expect, it } from 'vitest';

import { AppError } from '@founders-coffee/core';

import { hackathonSaveError } from './save-errors';

describe('hackathonSaveError', () => {
  it('names what the organiser can do about each refusal', () => {
    expect(hackathonSaveError(new AppError('rate_limited', 'slow'), 'en')).toBe(
      'You have created several events recently. Wait a few minutes, then try again.',
    );
    expect(
      hackathonSaveError({ code: 'organisation_not_approved' }, 'en'),
    ).toBe(
      'Only members of an approved organisation can create its hackathons.',
    );
    expect(hackathonSaveError({ code: 'hackathons_disabled' }, 'fr')).toBe(
      'Les hackathons ne sont pas encore ouverts dans ce pays.',
    );
  });

  it('falls back to the plain retry message for anything it does not know', () => {
    expect(hackathonSaveError(new Error('network'), 'en')).toBe(
      'Couldn’t save the draft. Try again.',
    );
  });
});
