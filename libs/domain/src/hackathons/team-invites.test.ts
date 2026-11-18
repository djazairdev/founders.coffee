import { describe, expect, it } from 'vitest';

import {
  decideJoinByInvite,
  decideTeamInvite,
  hackathonTeamJoinSchema,
  TEAM_INVITE_LIFETIME_MS,
} from './team-invites.js';

const timeline = {
  registrationOpensAt: Date.parse('2099-01-01T00:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T00:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T12:00:00Z'),
  endsAt: Date.parse('2099-01-16T18:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T18:00:00Z'),
};

const NOW = Date.parse('2099-01-12T00:00:00Z');
const AFTER_DEADLINE = Date.parse('2099-01-17T00:00:00Z');

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

describe('team invite links (B-TEAM-04)', () => {
  const captain = { teamId: 'team_a', isCaptain: true };

  it('lets only the captain share the team, until teams stop changing', () => {
    expect(
      codeOf(decideTeamInvite({ timeline, now: NOW, membership: captain })),
    ).toBeNull();
    expect(
      codeOf(
        decideTeamInvite({
          timeline,
          now: NOW,
          membership: { ...captain, isCaptain: false },
        }),
      ),
    ).toBe('not_team_captain');
    expect(
      codeOf(decideTeamInvite({ timeline, now: NOW, membership: null })),
    ).toBe('not_team_captain');
    expect(
      codeOf(
        decideTeamInvite({
          timeline,
          now: AFTER_DEADLINE,
          membership: captain,
        }),
      ),
    ).toBe('teams_locked');
  });

  const join = {
    invite: { expiresAt: NOW + TEAM_INVITE_LIFETIME_MS, isRevoked: false },
    timeline,
    now: NOW,
    registration: 'registered' as const,
    membership: null,
    teamSize: 2,
    teamMax: 3,
  };

  it('joins a registered participant in no team to a team with room', () => {
    expect(codeOf(decideJoinByInvite(join))).toBeNull();
  });

  it('refuses a revoked or expired link before anything else', () => {
    expect(
      codeOf(
        decideJoinByInvite({
          ...join,
          invite: { ...join.invite, isRevoked: true },
          registration: 'withdrawn',
        }),
      ),
    ).toBe('team_invite_invalid');
    expect(
      codeOf(
        decideJoinByInvite({
          ...join,
          invite: { expiresAt: NOW, isRevoked: false },
        }),
      ),
    ).toBe('team_invite_invalid');
  });

  it('refuses a full team, someone already in a team or without a place, and anyone after the deadline', () => {
    expect(codeOf(decideJoinByInvite({ ...join, teamSize: 3 }))).toBe(
      'team_full',
    );
    expect(
      codeOf(
        decideJoinByInvite({
          ...join,
          membership: { teamId: 'team_b', isCaptain: false },
        }),
      ),
    ).toBe('already_in_team');
    expect(
      codeOf(decideJoinByInvite({ ...join, registration: 'waitlisted' })),
    ).toBe('not_registered');
    expect(codeOf(decideJoinByInvite({ ...join, now: AFTER_DEADLINE }))).toBe(
      'teams_locked',
    );
  });

  it('takes a link token of 43 URL-safe characters only', () => {
    const takes = (token: string) =>
      hackathonTeamJoinSchema.safeParse({ token }).success;
    expect(takes('a'.repeat(43))).toBe(true);
    expect(takes(`${'a'.repeat(42)}+`)).toBe(false);
    expect(takes('a'.repeat(44))).toBe(false);
  });
});
