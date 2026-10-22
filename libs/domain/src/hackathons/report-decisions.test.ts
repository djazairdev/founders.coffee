import { describe, expect, it } from 'vitest';

import {
  decideReportReview,
  reportDecisionSchema,
} from './report-decisions.js';

const TARGET = {
  targetType: 'team',
  targetId: 'tea_0123456789abcdef0123456789abcdef',
} as const;

describe('report decisions (B-SAFE-02)', () => {
  it('dismisses with nothing more, and disqualifies only with a reason and evidence', () => {
    expect(
      reportDecisionSchema.safeParse({ ...TARGET, decision: 'dismiss' })
        .success,
    ).toBe(true);
    expect(
      reportDecisionSchema.safeParse({
        ...TARGET,
        decision: 'disqualify',
        reason: 'Too short',
        evidence: 'https://github.com/other/ledger',
      }).success,
    ).toBe(false);
    expect(
      reportDecisionSchema.safeParse({
        ...TARGET,
        decision: 'disqualify',
        reason: 'The code was copied from another team’s repository.',
        evidence: '   ',
      }).success,
    ).toBe(false);
    expect(
      reportDecisionSchema.parse({
        ...TARGET,
        decision: 'disqualify',
        reason: '  The code was copied from another team’s repository. ',
        evidence: 'https://github.com/other/ledger',
      }),
    ).toMatchObject({
      reason: 'The code was copied from another team’s repository.',
    });
  });

  it('refuses a target with no report left open, and disqualifying a team that is gone', () => {
    const codeOf = (input: Parameters<typeof decideReportReview>[0]) => {
      const decided = decideReportReview(input);
      return decided.ok ? decided.data : decided.error.code;
    };
    expect(
      codeOf({ decision: 'disqualify', teamId: null, openReports: 2 }),
    ).toBe('report_not_found');
    expect(
      codeOf({ decision: 'dismiss', teamId: null, openReports: 2 }),
    ).toEqual({ teamId: null });
    expect(
      codeOf({ decision: 'dismiss', teamId: 'tea_1', openReports: 0 }),
    ).toBe('report_decided');
    expect(
      codeOf({ decision: 'disqualify', teamId: 'tea_1', openReports: 1 }),
    ).toEqual({ teamId: 'tea_1' });
  });
});
