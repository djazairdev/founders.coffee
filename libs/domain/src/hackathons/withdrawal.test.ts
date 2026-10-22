import { describe, expect, it } from 'vitest';

import type { HackathonTimeline } from './timeline.js';
import { decideWithdrawal } from './withdrawal.js';

const DAY = 86_400_000;
const KICKOFF = Date.UTC(2099, 2, 12, 8);

const timeline: HackathonTimeline = {
  registrationOpensAt: KICKOFF - 30 * DAY,
  registrationClosesAt: KICKOFF - DAY,
  kickoffAt: KICKOFF,
  submissionDeadlineAt: KICKOFF + 2 * DAY,
  endsAt: KICKOFF + 2 * DAY,
  judgingEndsAt: KICKOFF + 9 * DAY,
};

const decide = (
  overrides: Partial<Parameters<typeof decideWithdrawal>[0]> = {},
) =>
  decideWithdrawal({
    timeline,
    now: KICKOFF - 2 * DAY,
    status: 'registered',
    membership: null,
    teamSize: 0,
    ...overrides,
  });

const codeOf = (result: ReturnType<typeof decideWithdrawal>) =>
  result.ok ? null : result.error.code;

describe('decideWithdrawal (B-REG-04)', () => {
  it('lets a registered or waitlisted member withdraw until the submission deadline', () => {
    expect(decide().ok).toBe(true);
    expect(decide({ status: 'waitlisted' }).ok).toBe(true);
    expect(decide({ now: timeline.submissionDeadlineAt - 1 }).ok).toBe(true);
    expect(codeOf(decide({ now: timeline.submissionDeadlineAt }))).toBe(
      'withdrawal_closed',
    );
  });

  it('refuses someone without a place or a wait', () => {
    for (const status of [null, 'withdrawn', 'disqualified'] as const)
      expect(codeOf(decide({ status }))).toBe('not_registered');
  });

  it('asks a captain with teammates to hand the team on first, but not one alone', () => {
    const captain = { teamId: 'team_1', isCaptain: true };

    expect(codeOf(decide({ membership: captain, teamSize: 3 }))).toBe(
      'captain_must_transfer',
    );
    expect(decide({ membership: captain, teamSize: 1 }).ok).toBe(true);
    expect(
      decide({
        membership: { teamId: 'team_1', isCaptain: false },
        teamSize: 3,
      }).ok,
    ).toBe(true);
  });
});
