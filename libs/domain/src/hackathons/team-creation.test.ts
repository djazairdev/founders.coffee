import { describe, expect, it } from 'vitest';

import {
  decideCreateTeam,
  hackathonTeamCreateSchema,
} from './team-creation.js';

const timeline = {
  registrationOpensAt: Date.parse('2099-01-01T00:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T00:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T12:00:00Z'),
  endsAt: Date.parse('2099-01-16T18:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T18:00:00Z'),
};

const codeOf = (result: ReturnType<typeof decideCreateTeam>) =>
  result.ok ? null : result.error.code;

describe('starting a team (B-TEAM-03)', () => {
  const base = {
    timeline,
    now: Date.parse('2099-01-12T00:00:00Z'),
    registration: 'registered' as const,
    membership: null,
  };

  it('lets a registered participant with no team start one', () => {
    expect(codeOf(decideCreateTeam(base))).toBeNull();
  });

  it('refuses someone waitlisted or withdrawn, someone in a team, and anyone after the deadline', () => {
    expect(
      codeOf(decideCreateTeam({ ...base, registration: 'waitlisted' })),
    ).toBe('not_registered');
    expect(
      codeOf(decideCreateTeam({ ...base, registration: 'withdrawn' })),
    ).toBe('not_registered');
    expect(
      codeOf(
        decideCreateTeam({
          ...base,
          membership: { teamId: 'team_1', isCaptain: false },
        }),
      ),
    ).toBe('already_in_team');
    expect(
      codeOf(decideCreateTeam({ ...base, now: timeline.submissionDeadlineAt })),
    ).toBe('teams_locked');
  });

  it('trims the name and description, and reads an empty description as none', () => {
    expect(
      hackathonTeamCreateSchema.parse({
        eventId: 'evt_0123456789abcdef0123456789abcdef',
        name: '  Byte Club ',
        description: '   ',
      }),
    ).toEqual({
      eventId: 'evt_0123456789abcdef0123456789abcdef',
      name: 'Byte Club',
      description: null,
      isLookingForMembers: false,
    });
    expect(
      hackathonTeamCreateSchema.safeParse({
        eventId: 'evt_0123456789abcdef0123456789abcdef',
        name: '   ',
      }).success,
    ).toBe(false);
  });
});
