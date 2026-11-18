import { describe, expect, it } from 'vitest';

import { AppError } from '@founders-coffee/core';

import { applicationRefusal } from './errors';

const refused = (code: string) => applicationRefusal(new AppError(code, 'x'));

describe('a refused organisation application (B-ORG-08)', () => {
  it('shows a general error when validation or address allocation fails', () => {
    expect(refused('organisation_slug_taken')).toEqual({ kind: 'failed' });
    expect(refused('validation_failed')).toEqual({ kind: 'failed' });
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
