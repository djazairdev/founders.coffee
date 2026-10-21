import { describe, expect, it } from 'vitest';

import { ORGANISATION_STATUSES } from '@founders-coffee/core';

import {
  canTransitionOrganisation,
  isOrganisationActive,
  transitionOrganisation,
} from './status-machine.js';

const ALLOWED = [
  ['pending', 'approved'],
  ['pending', 'rejected'],
  ['approved', 'suspended'],
  ['suspended', 'approved'],
] as const;

describe('organisation status machine', () => {
  it.each(ALLOWED)('moves %s to %s', (from, to) => {
    expect(transitionOrganisation(from, to)).toEqual({ ok: true, data: to });
  });

  it('refuses every other move with a typed error', () => {
    for (const from of ORGANISATION_STATUSES)
      for (const to of ORGANISATION_STATUSES) {
        if (ALLOWED.some(([a, b]) => a === from && b === to)) continue;
        expect(canTransitionOrganisation(from, to)).toBe(false);
        const result = transitionOrganisation(from, to);
        expect(result.ok).toBe(false);
        if (!result.ok)
          expect(result.error.code).toBe('invalid_organisation_transition');
      }
  });

  it('never reverses a rejection', () => {
    for (const to of ORGANISATION_STATUSES)
      expect(canTransitionOrganisation('rejected', to)).toBe(false);
  });
});

describe('isOrganisationActive', () => {
  it('is true only for an approved organisation', () => {
    expect(ORGANISATION_STATUSES.filter(isOrganisationActive)).toEqual([
      'approved',
    ]);
  });
});
