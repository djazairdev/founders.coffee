import { describe, expect, it } from 'vitest';

import {
  decideOrganisationStatus,
  organisationDecisionSchema,
} from './decisions.js';
import { canTransitionOrganisation } from './status-machine.js';

describe('operator decisions on an organisation (B-ORG-06)', () => {
  it.each([
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

  it.each(['approve', 'reject'])(
    'refuses initial organisation review action %s',
    (decision) => {
      expect(
        organisationDecisionSchema.safeParse({
          decision,
          note: 'A detailed note.',
        }).success,
      ).toBe(false);
    },
  );

  it.each([
    ['approved', 'reinstate'],
    ['rejected', 'suspend'],
    ['pending', 'suspend'],
  ] as const)('from %s, refuses to %s', (from, decision) => {
    const outcome = decideOrganisationStatus(from, decision);
    expect(outcome.ok ? null : outcome.error.code).toBe(
      'invalid_organisation_transition',
    );
  });

  it('takes an optional note with the other decisions, and drops a blank one', () => {
    expect(organisationDecisionSchema.parse({ decision: 'reinstate' })).toEqual(
      {
        decision: 'reinstate',
      },
    );
    expect(
      organisationDecisionSchema.parse({ decision: 'suspend', note: '   ' }),
    ).toEqual({ decision: 'suspend', note: undefined });
    expect(
      organisationDecisionSchema.safeParse({
        decision: 'reinstate',
        note: 'x'.repeat(1001),
      }).success,
    ).toBe(false);
    expect(
      organisationDecisionSchema.safeParse({ decision: 'delete' }).success,
    ).toBe(false);
  });
});
