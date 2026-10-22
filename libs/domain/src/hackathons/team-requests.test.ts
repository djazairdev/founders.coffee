import { describe, expect, it } from 'vitest';

import {
  decideTeamRequest,
  decideTeamRequestAnswer,
  decideTeamRequestCancel,
  hackathonTeamRequestDecisionSchema,
} from './team-requests.js';

const timeline = {
  registrationOpensAt: Date.parse('2099-01-01T00:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T00:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T12:00:00Z'),
  endsAt: Date.parse('2099-01-16T18:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T18:00:00Z'),
};

const requester = {
  timeline,
  now: Date.parse('2099-01-12T00:00:00Z'),
  registration: 'registered' as const,
  membership: null,
  teamSize: 2,
  teamMax: 3,
};

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

describe('asking to join a team (B-TEAM-05)', () => {
  it('lets a registered participant in no team ask a team with room, once at a time', () => {
    const ask = { ...requester, hasPendingRequest: false };
    expect(codeOf(decideTeamRequest(ask))).toBeNull();
    expect(codeOf(decideTeamRequest({ ...ask, hasPendingRequest: true }))).toBe(
      'team_request_exists',
    );
    expect(codeOf(decideTeamRequest({ ...ask, teamSize: 3 }))).toBe(
      'team_full',
    );
    expect(
      codeOf(decideTeamRequest({ ...ask, registration: 'withdrawn' })),
    ).toBe('not_registered');
    expect(
      codeOf(
        decideTeamRequest({
          ...ask,
          membership: { teamId: 'team_b', isCaptain: true },
        }),
      ),
    ).toBe('already_in_team');
  });

  const answer = {
    decision: 'accept' as const,
    request: { teamId: 'team_a', status: 'pending' as const },
    actor: { teamId: 'team_a', isCaptain: true },
    requester,
  };

  it("lets only the team's captain answer a pending request", () => {
    expect(codeOf(decideTeamRequestAnswer(answer))).toBeNull();
    expect(
      codeOf(
        decideTeamRequestAnswer({
          ...answer,
          actor: { teamId: 'team_a', isCaptain: false },
        }),
      ),
    ).toBe('not_team_captain');
    expect(
      codeOf(
        decideTeamRequestAnswer({
          ...answer,
          actor: { teamId: 'team_b', isCaptain: true },
        }),
      ),
    ).toBe('not_team_captain');
    expect(
      codeOf(
        decideTeamRequestAnswer({
          ...answer,
          request: { teamId: 'team_a', status: 'cancelled' },
        }),
      ),
    ).toBe('team_request_not_found');
  });

  it('accepts only when the member can still join, and declines regardless', () => {
    const full = { ...answer, requester: { ...requester, teamSize: 3 } };
    expect(codeOf(decideTeamRequestAnswer(full))).toBe('team_full');
    expect(
      codeOf(decideTeamRequestAnswer({ ...full, decision: 'decline' })),
    ).toBeNull();
    expect(
      codeOf(
        decideTeamRequestAnswer({
          ...answer,
          decision: 'decline',
          requester: { ...requester, now: Date.parse('2099-01-17T00:00:00Z') },
        }),
      ),
    ).toBe('teams_locked');
  });

  it('lets only the member who asked take a pending request back', () => {
    const request = { userId: 'usr_a', status: 'pending' as const };
    expect(
      codeOf(decideTeamRequestCancel({ request, userId: 'usr_a' })),
    ).toBeNull();
    expect(codeOf(decideTeamRequestCancel({ request, userId: 'usr_b' }))).toBe(
      'team_request_not_found',
    );
    expect(
      codeOf(
        decideTeamRequestCancel({
          request: { ...request, status: 'accepted' },
          userId: 'usr_a',
        }),
      ),
    ).toBe('team_request_not_found');
    expect(
      hackathonTeamRequestDecisionSchema.safeParse({
        eventId: `evt_${'a'.repeat(32)}`,
        requestId: `treq_${'a'.repeat(32)}`,
        decision: 'ignore',
      }).success,
    ).toBe(false);
  });
});
