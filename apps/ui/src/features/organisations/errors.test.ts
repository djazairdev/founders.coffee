import { describe, expect, it } from 'vitest';

import { AppError } from '@founders-coffee/core';

import { applicationRefusal } from './errors';

const refused = (code: string) => applicationRefusal(new AppError(code, 'x'));

describe('a refused organisation application (B-ORG-08)', () => {
  it('sends the applicant back to the address when it is taken', () => {
    expect(refused('organisation_slug_taken')).toEqual({ kind: 'slug_taken' });
  });

  it('reads a server-side validation refusal as the city, the one check the form cannot make', () => {
    expect(refused('validation_failed')).toEqual({
      kind: 'field',
      field: 'cityCode',
    });
  });

  it('tells a closed market apart from a failure', () => {
    expect(refused('hackathons_disabled')).toEqual({
      kind: 'hackathons_disabled',
    });
    expect(refused('rate_limited')).toEqual({ kind: 'rate_limited' });
    expect(applicationRefusal(new Error('network'))).toEqual({
      kind: 'failed',
    });
  });
});
