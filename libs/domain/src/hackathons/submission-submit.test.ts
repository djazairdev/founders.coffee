import { describe, expect, it } from 'vitest';

import { decideSubmit, submissionSubmitSchema } from './submission-submit.js';

const timeline = {
  registrationOpensAt: Date.parse('2099-01-01T00:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T00:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T12:00:00Z'),
  endsAt: Date.parse('2099-01-16T18:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T18:00:00Z'),
};

const TRACK = 'trk_0123456789abcdef0123456789abcdef';

const codeOf = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? null : result.error?.code;

const entry = {
  status: 'draft' as const,
  version: 3,
  trackId: TRACK,
  title: 'Ledger',
  description: 'A ledger a corner shop keeps on its phone.',
  repositoryUrl: 'https://github.com/byte-club/ledger',
  demoVideoUrl: null,
  pullRequestUrls: [],
  aiTools: [],
  aiStatement: 'We wrote every line ourselves and used no AI tools.',
};

const decide = (changes: Partial<Parameters<typeof decideSubmit>[0]> = {}) =>
  decideSubmit({
    timeline,
    now: timeline.submissionDeadlineAt - 3_600_000,
    membership: { teamId: 'team_a', isCaptain: true },
    version: 3,
    entry,
    hackathon: { trackIds: [TRACK], aiPolicy: 'disclosed' },
    ...changes,
  });

describe('submitting an entry (B-SUB-04)', () => {
  it('asks for the version seen and the original-work statement', () => {
    expect(
      submissionSubmitSchema.safeParse({
        eventId: 'evt_0123456789abcdef0123456789abcdef',
        version: 3,
        isOriginalWorkAttested: true,
      }).success,
    ).toBe(true);
    expect(
      submissionSubmitSchema.safeParse({
        eventId: 'evt_0123456789abcdef0123456789abcdef',
        version: 3,
        isOriginalWorkAttested: false,
      }).success,
    ).toBe(false);
  });

  it('takes a complete entry from its captain while the team is building', () => {
    expect(decide()).toMatchObject({ ok: true, data: { trackId: TRACK } });
    expect(decide({ entry: { ...entry, status: 'submitted' } }).ok).toBe(true);
  });

  it('decides by the deadline to the millisecond', () => {
    const deadline = timeline.submissionDeadlineAt;

    expect(codeOf(decide({ now: deadline - 1 }))).toBeNull();
    expect(codeOf(decide({ now: deadline }))).toBe('deadline_passed');
    expect(codeOf(decide({ now: timeline.kickoffAt - 1 }))).toBe(
      'building_not_started',
    );
  });

  it('refuses anyone but the captain', () => {
    expect(
      codeOf(decide({ membership: { teamId: 'team_a', isCaptain: false } })),
    ).toBe('not_team_captain');
    expect(codeOf(decide({ membership: null }))).toBe('not_team_captain');
  });

  it('refuses an entry never saved, a stale version, and a disqualified one', () => {
    expect(codeOf(decide({ entry: null }))).toBe('submission_incomplete');
    expect(codeOf(decide({ version: 2 }))).toBe('submission_conflict');
    expect(
      codeOf(decide({ entry: { ...entry, status: 'disqualified' } })),
    ).toBe('submission_locked');
  });

  it('refuses an entry missing what a submission needs', () => {
    expect(codeOf(decide({ entry: { ...entry, trackId: null } }))).toBe(
      'submission_incomplete',
    );
    expect(codeOf(decide({ entry: { ...entry, description: 'Short.' } }))).toBe(
      'submission_incomplete',
    );
    expect(codeOf(decide({ entry: { ...entry, aiStatement: null } }))).toBe(
      'submission_incomplete',
    );
  });

  it('holds the hackathon’s own rules: its tracks, and AI tools when it is AI-native', () => {
    expect(
      codeOf(
        decide({
          hackathon: {
            trackIds: ['trk_ffffffffffffffffffffffffffffffff'],
            aiPolicy: 'disclosed',
          },
        }),
      ),
    ).toBe('track_not_in_hackathon');
    expect(
      codeOf(
        decide({ hackathon: { trackIds: [TRACK], aiPolicy: 'ai_native' } }),
      ),
    ).toBe('ai_tools_required');
  });
});
