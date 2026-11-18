import { describe, expect, it } from 'vitest';

import {
  decideScreenshotChange,
  submissionScreenshotKey,
} from './submission-screenshots.js';

const timeline = {
  registrationOpensAt: 1_000,
  registrationClosesAt: 2_000,
  kickoffAt: 3_000,
  submissionDeadlineAt: 4_000,
  endsAt: 5_000,
  judgingEndsAt: 6_000,
};
const captain = { teamId: 'tem_1', isCaptain: true };

const decide = (
  overrides: Partial<Parameters<typeof decideScreenshotChange>[0]> = {},
) =>
  decideScreenshotChange({
    timeline,
    now: 3_500,
    membership: captain,
    entry: 'draft',
    ...overrides,
  });

const codeOf = (result: ReturnType<typeof decide>) =>
  result.ok ? 'ok' : result.error.code;

describe('decideScreenshotChange (B-SUB-09)', () => {
  it('lets the captain change a saved entry while the team is building', () => {
    expect(codeOf(decide())).toBe('ok');
    expect(codeOf(decide({ entry: 'submitted' }))).toBe('ok');
  });

  it('refuses before kickoff and after the deadline', () => {
    expect(codeOf(decide({ now: 2_500 }))).toBe('building_not_started');
    expect(codeOf(decide({ now: 4_000 }))).toBe('deadline_passed');
  });

  it('refuses a teammate, and anyone outside the team', () => {
    expect(
      codeOf(decide({ membership: { teamId: 'tem_1', isCaptain: false } })),
    ).toBe('not_team_captain');
    expect(codeOf(decide({ membership: null }))).toBe('not_team_captain');
  });

  it('asks for the entry to be saved first, and leaves a disqualified one alone', () => {
    expect(codeOf(decide({ entry: null }))).toBe('entry_not_saved');
    expect(codeOf(decide({ entry: 'disqualified' }))).toBe('submission_locked');
  });
});

describe('submissionScreenshotKey', () => {
  it('keeps every image of an entry under its own prefix', () => {
    expect(submissionScreenshotKey('sub_1', 'sht_2')).toBe(
      'submissions/sub_1/sht_2.webp',
    );
  });
});
