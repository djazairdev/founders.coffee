import { describe, expect, it } from 'vitest';

import type { Result } from '@founders-coffee/core';

import {
  canChangeTeams,
  decideCaptainTransfer,
  decideJoinTeam,
  decideLeaveTeam,
  isTeamSizeAllowed,
  teamSizeLimitsSchema,
} from './teams.js';
import type { HackathonTimeline } from './timeline.js';

const HOUR = 3_600_000;
const timeline: HackathonTimeline = {
  registrationOpensAt: 100 * HOUR,
  registrationClosesAt: 200 * HOUR,
  kickoffAt: 210 * HOUR,
  submissionDeadlineAt: 300 * HOUR,
  endsAt: 310 * HOUR,
  judgingEndsAt: 400 * HOUR,
};
const limits = { min: 2, max: 4 };
const building = 250 * HOUR;
const member = { teamId: 'team_1', isCaptain: false };
const captain = { teamId: 'team_1', isCaptain: true };

const codeOf = (result: Result<true>) => (result.ok ? null : result.error.code);

const join = (overrides: Partial<Parameters<typeof decideJoinTeam>[0]> = {}) =>
  codeOf(
    decideJoinTeam({
      timeline,
      now: building,
      registration: 'registered',
      membership: null,
      teamSize: 1,
      limits,
      ...overrides,
    }),
  );

describe('team size limits', () => {
  it('takes limits from one to ten, the smallest no larger than the largest', () => {
    expect(teamSizeLimitsSchema.safeParse({ min: 1, max: 1 }).success).toBe(
      true,
    );
    expect(teamSizeLimitsSchema.safeParse({ min: 2, max: 10 }).success).toBe(
      true,
    );
    expect(teamSizeLimitsSchema.safeParse({ min: 0, max: 4 }).success).toBe(
      false,
    );
    expect(teamSizeLimitsSchema.safeParse({ min: 2, max: 11 }).success).toBe(
      false,
    );
    expect(teamSizeLimitsSchema.safeParse({ min: 5, max: 4 }).success).toBe(
      false,
    );
  });

  it('allows a team of a size inside the limits', () => {
    expect(
      [1, 2, 3, 4, 5].map((size) => isTeamSizeAllowed(size, limits)),
    ).toEqual([false, true, true, true, false]);
  });
});

describe('when teams change', () => {
  it('lets teams change until the submission deadline, and not from it', () => {
    expect(canChangeTeams(timeline, 150 * HOUR)).toBe(true);
    expect(canChangeTeams(timeline, 300 * HOUR - 1)).toBe(true);
    expect(canChangeTeams(timeline, 300 * HOUR)).toBe(false);
    expect(canChangeTeams(timeline, 500 * HOUR)).toBe(false);
  });
});

describe('joining a team', () => {
  it('lets a registered participant without a team join one with room', () => {
    expect(join()).toBeNull();
    expect(join({ teamSize: 0 })).toBeNull();
  });

  it('refuses after the submission deadline', () => {
    expect(join({ now: 300 * HOUR })).toBe('teams_locked');
  });

  it.each([null, 'waitlisted'] as const)(
    'refuses a participant whose registration is %s',
    (registration) => {
      expect(join({ registration })).toBe('not_registered');
    },
  );

  it('keeps a participant to one team', () => {
    expect(join({ membership: member })).toBe('already_in_team');
  });

  it('refuses a team already at the largest size', () => {
    expect(join({ teamSize: 3 })).toBeNull();
    expect(join({ teamSize: 4 })).toBe('team_full');
  });
});

describe('leaving a team', () => {
  const leave = (
    overrides: Partial<Parameters<typeof decideLeaveTeam>[0]> = {},
  ) =>
    codeOf(
      decideLeaveTeam({
        timeline,
        now: building,
        membership: member,
        teamSize: 3,
        ...overrides,
      }),
    );

  it('lets a member leave', () => {
    expect(leave()).toBeNull();
  });

  it('asks the captain to hand the team on before leaving it to others', () => {
    expect(leave({ membership: captain })).toBe('captain_must_transfer');
    expect(leave({ membership: captain, teamSize: 1 })).toBeNull();
  });

  it('refuses someone outside the team, and anyone after the deadline', () => {
    expect(leave({ membership: null })).toBe('not_team_member');
    expect(leave({ now: 300 * HOUR })).toBe('teams_locked');
  });
});

describe('handing the team on', () => {
  const transfer = (
    overrides: Partial<Parameters<typeof decideCaptainTransfer>[0]> = {},
  ) =>
    codeOf(
      decideCaptainTransfer({
        timeline,
        now: building,
        actor: captain,
        successor: member,
        ...overrides,
      }),
    );

  it('lets the captain hand the team to one of its members', () => {
    expect(transfer()).toBeNull();
  });

  it('lets only the captain do it', () => {
    expect(transfer({ actor: member })).toBe('not_team_captain');
    expect(transfer({ actor: null })).toBe('not_team_captain');
  });

  it('hands it only to someone else in the same team', () => {
    expect(transfer({ successor: null })).toBe('not_team_member');
    expect(transfer({ successor: captain })).toBe('not_team_member');
    expect(
      transfer({ successor: { teamId: 'team_2', isCaptain: false } }),
    ).toBe('not_team_member');
  });

  it('refuses after the deadline', () => {
    expect(transfer({ now: 300 * HOUR })).toBe('teams_locked');
  });
});
