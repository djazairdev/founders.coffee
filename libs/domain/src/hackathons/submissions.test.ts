import { describe, expect, it } from 'vitest';

import {
  checkSubmission,
  SUBMISSION_PULL_REQUEST_LIMIT,
  submissionSchema,
  type Submission,
} from './submissions.js';

const TRACK = `trk_${'a'.repeat(32)}`;
const OTHER_TRACK = `trk_${'b'.repeat(32)}`;

const valid = {
  trackId: TRACK,
  title: 'Wilaya bus times',
  description: 'Live bus times for every wilaya, from open data feeds.',
  repositoryUrl: 'https://github.com/team/bus-times',
  aiStatement: 'We wrote the API and the UI; Copilot suggested tests.',
  isOriginalWorkAttested: true,
};

const parse = (overrides: Record<string, unknown> = {}) =>
  submissionSchema.safeParse({ ...valid, ...overrides });

const parsed = (overrides: Record<string, unknown> = {}): Submission =>
  submissionSchema.parse({ ...valid, ...overrides });

const codeOf = (
  submission: Submission,
  aiPolicy: 'disclosed' | 'ai_native' | 'restricted' = 'disclosed',
) => {
  const result = checkSubmission(submission, { trackIds: [TRACK], aiPolicy });
  return result.ok ? null : result.error.code;
};

describe('the shape of a submission', () => {
  it('accepts a complete submission and fills the optional lists', () => {
    expect(parsed()).toMatchObject({
      demoVideoUrl: null,
      pullRequestUrls: [],
      aiTools: [],
    });
  });

  it.each([
    ['repositoryUrl', 'http://github.com/team/bus-times'],
    ['repositoryUrl', 'https://user:secret@github.com/team/bus-times'],
    ['repositoryUrl', 'github.com/team/bus-times'],
    ['demoVideoUrl', 'http://youtu.be/abc'],
    ['pullRequestUrls', ['https://github.com/a/b/pull/1', 'ftp://x/y']],
  ])(
    'refuses %s %j, which is not a credential-free HTTPS link',
    (field, value) => {
      expect(parse({ [field]: value }).success).toBe(false);
    },
  );

  it('takes HTTPS links for the demo video and the pull requests', () => {
    expect(
      parse({
        demoVideoUrl: 'https://youtu.be/abc',
        pullRequestUrls: ['https://github.com/djazairdev/wilayas/pull/21'],
      }).success,
    ).toBe(true);
  });

  it('caps the pull requests a team lists', () => {
    const urls = (count: number) =>
      Array.from(
        { length: count },
        (_, index) => `https://github.com/a/b/pull/${index + 1}`,
      );
    expect(
      parse({ pullRequestUrls: urls(SUBMISSION_PULL_REQUEST_LIMIT) }).success,
    ).toBe(true);
    expect(
      parse({ pullRequestUrls: urls(SUBMISSION_PULL_REQUEST_LIMIT + 1) })
        .success,
    ).toBe(false);
  });

  it('always asks for the AI statement, whatever the policy', () => {
    expect(parse({ aiStatement: undefined }).success).toBe(false);
    expect(parse({ aiStatement: 'none' }).success).toBe(false);
  });

  it('always asks the team to attest that the work is its own', () => {
    expect(parse({ isOriginalWorkAttested: false }).success).toBe(false);
    expect(parse({ isOriginalWorkAttested: undefined }).success).toBe(false);
  });

  it('refuses a field it does not know', () => {
    expect(parse({ status: 'submitted' }).success).toBe(false);
  });
});

describe('a submission against its hackathon', () => {
  it('takes a submission in one of the hackathon’s tracks', () => {
    expect(codeOf(parsed())).toBeNull();
  });

  it('refuses a track from elsewhere', () => {
    expect(codeOf(parsed({ trackId: OTHER_TRACK }))).toBe(
      'track_not_in_hackathon',
    );
  });

  it('asks an AI-native entry to name its tools', () => {
    expect(codeOf(parsed(), 'ai_native')).toBe('ai_tools_required');
    expect(
      codeOf(parsed({ aiTools: ['Claude Code', 'Copilot'] }), 'ai_native'),
    ).toBeNull();
  });

  it.each(['disclosed', 'restricted'] as const)(
    'lets a team under the %s policy say in its statement that it used no tools',
    (policy) => {
      expect(codeOf(parsed({ aiTools: [] }), policy)).toBeNull();
    },
  );
});
