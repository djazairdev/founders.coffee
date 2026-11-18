import { describe, expect, it } from 'vitest';

import {
  decideRemoveMember,
  hackathonTeamMemberSchema,
} from './team-changes.js';

const timeline = {
  registrationOpensAt: Date.parse('2099-01-01T00:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T00:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T12:00:00Z'),
  endsAt: Date.parse('2099-01-16T18:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T18:00:00Z'),
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

describe('removing a team member (B-TEAM-06)', () => {
  const removal = {
    timeline,
    now: Date.parse('2099-01-12T00:00:00Z'),
    actor: { teamId: 'team_a', isCaptain: true },
    member: { teamId: 'team_a', isCaptain: false },
  };

  it('lets the captain remove another member of the team', () => {
    expect(codeOf(decideRemoveMember(removal))).toBeNull();
  });

  it('refuses anyone but the captain, a member of another team, the captain themself, and any change after the deadline', () => {
    expect(
      codeOf(
        decideRemoveMember({
          ...removal,
          actor: { teamId: 'team_a', isCaptain: false },
        }),
      ),
    ).toBe('not_team_captain');
    expect(
      codeOf(
        decideRemoveMember({
          ...removal,
          member: { teamId: 'team_b', isCaptain: false },
        }),
      ),
    ).toBe('not_team_member');
    expect(
      codeOf(decideRemoveMember({ ...removal, member: removal.actor })),
    ).toBe('not_team_member');
    expect(codeOf(decideRemoveMember({ ...removal, member: null }))).toBe(
      'not_team_member',
    );
    expect(
      codeOf(
        decideRemoveMember({
          ...removal,
          now: Date.parse('2099-01-17T00:00:00Z'),
        }),
      ),
    ).toBe('teams_locked');
  });

  it('takes a member by their user id', () => {
    expect(
      hackathonTeamMemberSchema.safeParse({
        eventId: `evt_${'a'.repeat(32)}`,
        memberId: 'usr_rr1',
      }).success,
    ).toBe(true);
  });
});
