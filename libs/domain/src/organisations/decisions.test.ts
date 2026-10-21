import { describe, expect, it } from 'vitest';

import {
  decideOrganisationStatus,
  organisationDecisionSchema,
} from './decisions.js';
import { canTransitionOrganisation } from './status-machine.js';

describe('operator decisions on an organisation (B-ORG-06)', () => {
  it.each([
    ['pending', 'approve', 'approved', 'approved'],
    ['pending', 'reject', 'rejected', 'rejected'],
    ['approved', 'suspend', 'suspended', 'suspended'],
    ['suspended', 'reinstate', 'approved', 'approved'],
  ] as const)(
    'from %s, %s moves to %s and is audited as %s',
    (from, decision, to, action) => {
      const outcome = decideOrganisationStatus(from, decision);

      expect(outcome).toEqual({ ok: true, data: { from, to, action } });
      expect(canTransitionOrganisation(from, to)).toBe(true);
    },
  );

  it.each([
    ['suspended', 'approve'],
    ['approved', 'reinstate'],
    ['approved', 'reject'],
    ['rejected', 'approve'],
    ['pending', 'suspend'],
  ] as const)('from %s, refuses to %s', (from, decision) => {
    const outcome = decideOrganisationStatus(from, decision);

    expect(outcome.ok ? null : outcome.error.code).toBe(
      'invalid_organisation_transition',
    );
  });

  it('asks a rejection for a note of ten characters or more', () => {
    expect(
      organisationDecisionSchema.safeParse({ decision: 'reject' }).success,
    ).toBe(false);
    expect(
      organisationDecisionSchema.safeParse({ decision: 'reject', note: 'No.' })
        .success,
    ).toBe(false);
    expect(
      organisationDecisionSchema.parse({
        decision: 'reject',
        note: '  Not an organisation of builders.  ',
      }),
    ).toEqual({
      decision: 'reject',
      note: 'Not an organisation of builders.',
    });
  });

  it('takes an optional note with the other decisions, and drops a blank one', () => {
    expect(organisationDecisionSchema.parse({ decision: 'approve' })).toEqual({
      decision: 'approve',
    });
    expect(
      organisationDecisionSchema.parse({ decision: 'suspend', note: '   ' }),
    ).toEqual({ decision: 'suspend', note: undefined });
    expect(
      organisationDecisionSchema.safeParse({
        decision: 'approve',
        note: 'x'.repeat(1001),
      }).success,
    ).toBe(false);
    expect(
      organisationDecisionSchema.safeParse({ decision: 'delete' }).success,
    ).toBe(false);
  });
});
