import { describe, expect, it } from 'vitest';

import { decideHackathonReport, hackathonReportSchema } from './reports.js';

const codeOf = (result: ReturnType<typeof decideHackathonReport>) =>
  result.ok ? null : result.error.code;

describe('reporting an entry or a team (B-SAFE-01)', () => {
  it('lets a member report another team once', () => {
    const standing = { isReporterInTeam: false, hasReported: false };
    expect(decideHackathonReport(standing).ok).toBe(true);
    expect(codeOf(decideHackathonReport(null))).toBe('report_target_not_found');
    expect(
      codeOf(decideHackathonReport({ ...standing, isReporterInTeam: true })),
    ).toBe('own_team_report');
    expect(
      codeOf(decideHackathonReport({ ...standing, hasReported: true })),
    ).toBe('already_reported');
  });

  it('takes a reason from the list and nothing written', () => {
    const report = {
      eventId: 'evt_0123456789abcdef0123456789abcdef',
      targetType: 'submission',
      targetId: 'sub_0123456789abcdef0123456789abcdef',
      reason: 'plagiarism',
    };
    expect(hackathonReportSchema.safeParse(report).success).toBe(true);
    expect(
      hackathonReportSchema.safeParse({ ...report, reason: 'boring' }).success,
    ).toBe(false);
    expect(
      hackathonReportSchema.safeParse({ ...report, details: 'they copied' })
        .success,
    ).toBe(false);
    expect(
      hackathonReportSchema.safeParse({ ...report, targetType: 'judge' })
        .success,
    ).toBe(false);
  });
});
